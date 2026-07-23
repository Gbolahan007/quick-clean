import {
  EmptyState,
  FilterSelect,
  Pagination,
  StatusBadge,
} from "@/app/admin/_components/AdminUI";
import { RefundModal } from "@/app/admin/_components/RefundModal";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const PAGE_SIZE = 30;

const STATUS_OPTIONS = [
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
  { label: "Partially refunded", value: "partially_refunded" },
];

interface SearchParams {
  status?: string;
  tab?: string;
  page?: string;
}

async function fetchPayments(params: SearchParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("payments")
    .select(
      `
      id, booking_id, stripe_payment_intent_id, stripe_invoice_id,
      stripe_refund_id, amount_cents, currency, status,
      failure_message, billing_period_start, billing_period_end,
      visits_covered, is_first_payment, paid_at, refunded_at, created_at,
      bookings (
        id, plan_label, service_type, frequency,
        customers ( full_name, email )
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.tab === "failed") {
    query = query.eq("status", "failed");
  } else if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/payments] Fetch error:", error.message);
    return { payments: [], total: 0, page, totalPages: 0 };
  }

  return {
    payments: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

async function fetchWebhookStatus() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [{ data: lastEvent }, { count: failedCount }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("stripe_webhook_events")
        .select("stripe_event_id, event_type, received_at, processed")
        .order("received_at", { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .not("processing_error", "is", null),

      supabase
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("processed", false),
    ]);

  // Compute isHealthy server-side — avoids Date.now() during client render
  const lastReceivedAt = (lastEvent as { received_at: string } | null)
    ?.received_at;
  const lastEventAge = lastReceivedAt
    ? Date.now() - new Date(lastReceivedAt).getTime()
    : Infinity;

  const isHealthy =
    (failedCount ?? 0) === 0 &&
    (pendingCount ?? 0) === 0 &&
    lastEvent !== null &&
    lastEventAge < 24 * 60 * 60 * 1000;

  return {
    lastEvent,
    failedCount: failedCount ?? 0,
    pendingCount: pendingCount ?? 0,
    isHealthy,
    lastEventAge,
  };
}

async function fetchPaymentStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const monthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { data: succeeded },
    { count: failedCount },
    { count: refundedCount },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("status", "succeeded")
      .gte("paid_at", monthAgo),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", monthAgo),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", ["refunded", "partially_refunded"])
      .gte("refunded_at", monthAgo),
  ]);

  const revenue = (succeeded ?? []).reduce(
    (s, p) => s + (p.amount_cents ?? 0),
    0,
  );

  return {
    monthlyRevenueCents: revenue,
    failedCount: failedCount ?? 0,
    refundedCount: refundedCount ?? 0,
  };
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function timeAgoMs(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const tab = params.tab ?? "all";

  const [{ payments, total, page, totalPages }, webhook, stats] =
    await Promise.all([
      fetchPayments(params),
      fetchWebhookStatus(),
      fetchPaymentStats(),
    ]);

  // isHealthy computed server-side in fetchWebhookStatus — no Date.now() during render
  const { isHealthy } = webhook;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight ">
        Payments
      </h1>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Revenue (30d)"
          value={fmtEur(stats.monthlyRevenueCents)}
          color="text-[#3d6b47]"
        />
        <StatCard
          label="Failed (30d)"
          value={stats.failedCount}
          color={stats.failedCount > 0 ? "text-red-600" : "text-gray-400"}
        />
        <StatCard
          label="Refunded (30d)"
          value={stats.refundedCount}
          color="text-blue-600"
        />
      </div>

      {/* ── Webhook health panel ─────────────────────────────────────── */}
      <div
        className={[
          "rounded-2xl border px-5 py-4",
          isHealthy
            ? "bg-[#f0f8f3] border-[#d4e8d9]"
            : "bg-amber-50 border-amber-200",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {isHealthy ? (
              <CheckCircle className="w-5 h-5 text-[#7c9885] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-[13px] font-bold text-[#0a1628]">
                Stripe webhooks — {isHealthy ? "healthy" : "attention needed"}
              </p>
              {webhook.lastEvent && (
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Last event:{" "}
                  <span className="font-medium">
                    {(webhook.lastEvent as { event_type: string }).event_type}
                  </span>
                  {" · "}
                  {timeAgoMs(webhook.lastEventAge)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-4 shrink-0 text-right">
            {webhook.failedCount > 0 && (
              <div>
                <p className="text-[18px] font-extrabold text-red-600">
                  {webhook.failedCount}
                </p>
                <p className="text-[11px] text-gray-400">errors</p>
              </div>
            )}
            {webhook.pendingCount > 0 && (
              <div>
                <p className="text-[18px] font-extrabold text-amber-600">
                  {webhook.pendingCount}
                </p>
                <p className="text-[11px] text-gray-400">unprocessed</p>
              </div>
            )}
          </div>
        </div>
        {(webhook.failedCount > 0 || webhook.pendingCount > 0) && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <Link
              href="/admin/payments/webhooks"
              className="text-[13px] font-semibold text-amber-700 hover:text-amber-900 transition-colors"
            >
              View failed webhook events →
            </Link>
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { label: "All payments", value: "all" },
          { label: "Failed", value: "failed" },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/admin/payments?tab=${t.value}`}
            className={[
              "px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors",
              tab === t.value
                ? "border-[#7c9885] text-[#0a1628]"
                : "border-transparent text-gray-400 hover:text-[#0a1628]",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
        <div className="ml-auto pb-2">
          <FilterSelect
            paramName="status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* ── Failed payments alert ────────────────────────────────────── */}
      {tab === "failed" && total > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[13px] text-red-800">
            <strong>{total}</strong> failed payment{total !== 1 ? "s" : ""}.
            These customers may need a payment reminder.
          </p>
        </div>
      )}

      {/* ── Payments table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {payments.length === 0 ? (
          <EmptyState
            message={
              tab === "failed" ? "No failed payments." : "No payments found."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      "Customer",
                      "Plan",
                      "Amount",
                      "Status",
                      "Date",
                      "Invoice",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const booking = p.bookings as any;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const customer = booking?.customers as any;
                    const canRefund =
                      p.status === "succeeded" && !!p.stripe_payment_intent_id;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0a1628] truncate max-w-40">
                            {customer?.full_name ?? "—"}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate max-w-40">
                            {customer?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[#0a1628]">
                            {booking?.plan_label ?? "—"}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {booking?.frequency}
                            {p.is_first_payment && (
                              <span className="ml-1 text-[#7c9885] font-bold">
                                1st
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0a1628] whitespace-nowrap">
                          {fmtEur(p.amount_cents)}
                          {p.status === "partially_refunded" &&
                            p.stripe_refund_id && (
                              <p className="text-[11px] text-blue-500 font-normal">
                                partial refund
                              </p>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                          {p.failure_message && (
                            <p className="text-[11px] text-red-500 mt-0.5 max-w-40 truncate">
                              {p.failure_message}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {fmt(p.paid_at ?? p.created_at)}
                          {p.refunded_at && (
                            <p className="text-[11px] text-blue-500">
                              Refunded {fmt(p.refunded_at)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.stripe_invoice_id ? (
                            <a
                              href={`https://dashboard.stripe.com/test/invoices/${p.stripe_invoice_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-[#7c9885] hover:underline"
                            >
                              {p.stripe_invoice_id.slice(0, 14)}…
                            </a>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/bookings/${p.booking_id}`}
                              className="text-[#7c9885] font-semibold text-[12px] hover:text-[#3d6b47] transition-colors whitespace-nowrap"
                            >
                              Booking →
                            </Link>
                            {canRefund && (
                              <RefundModal
                                paymentId={p.id}
                                amountCents={p.amount_cents}
                                currency={p.currency ?? "eur"}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
      <p className="text-[12px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
