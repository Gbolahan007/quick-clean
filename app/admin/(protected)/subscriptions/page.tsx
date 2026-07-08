// app/admin/(protected)/subscriptions/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import {
  FilterSelect,
  StatusBadge,
  Pagination,
  EmptyState,
} from "@/app/admin/_components/AdminUI";
import { SubscriptionActions } from "../../_components/SubscriptionActions";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Past due", value: "past_due" },
  { label: "Cancelled", value: "canceled" },
  { label: "Trialing", value: "trialing" },
];

interface SearchParams {
  status?: string;
  page?: string;
}

async function fetchSubscriptions(params: SearchParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("bookings")
    .select(
      `
      id, plan_label, service_type, frequency,
      final_price, final_price_cents,
      subscription_status, cancel_at_period_end, canceled_at,
      current_period_start, current_period_end,
      visits_per_month, stripe_subscription_id,
      is_first_booking, discount_source,
      created_at,
      customers (
        id, full_name, email, phone
      )
    `,
      { count: "exact" },
    )
    .not("stripe_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.status) {
    query = query.eq("subscription_status", params.status);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/subscriptions] Fetch error:", error.message);
    return { subscriptions: [], total: 0, page, totalPages: 0 };
  }

  return {
    subscriptions: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

async function fetchSubscriptionStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [
    { count: activeCount },
    { count: pastDueCount },
    { count: cancellingCount },
    { data: revenueData },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active")
      .eq("cancel_at_period_end", false),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "past_due"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active")
      .eq("cancel_at_period_end", true),
    supabase
      .from("bookings")
      .select("final_price")
      .eq("subscription_status", "active"),
  ]);

  const mrr = (revenueData ?? []).reduce(
    (sum, b) => sum + Number(b.final_price ?? 0),
    0,
  );

  return {
    activeCount: activeCount ?? 0,
    pastDueCount: pastDueCount ?? 0,
    cancellingCount: cancellingCount ?? 0,
    mrr,
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

export default async function AdminSubscriptionsPage({
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
  const [{ subscriptions, total, page, totalPages }, stats] = await Promise.all(
    [fetchSubscriptions(params), fetchSubscriptionStats()],
  );

  return (
    <div className="space-y-5 max-w-7xl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
        Subscriptions
      </h1>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active",
            value: stats.activeCount,
            color: "text-[#3d6b47]",
          },
          {
            label: "MRR",
            value: `€${stats.mrr.toFixed(0)}`,
            color: "text-blue-600",
          },
          {
            label: "Past due",
            value: stats.pastDueCount,
            color: stats.pastDueCount > 0 ? "text-red-600" : "text-gray-400",
          },
          {
            label: "Cancelling",
            value: stats.cancellingCount,
            color:
              stats.cancellingCount > 0 ? "text-amber-600" : "text-gray-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-200 px-5 py-4"
          >
            <p className={`text-[22px] font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <FilterSelect
          paramName="status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
        />
        <p className="text-[13px] text-gray-400 ml-auto">
          {total.toLocaleString()} subscriptions
        </p>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {subscriptions.length === 0 ? (
          <EmptyState message="No subscriptions found." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      "Customer",
                      "Plan",
                      "Monthly",
                      "Status",
                      "Next billing",
                      "Actions",
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
                  {subscriptions.map((sub) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const customer = sub.customers as any;
                    return (
                      <tr
                        key={sub.id}
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
                            {sub.plan_label ?? sub.service_type}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {sub.frequency}
                            {sub.visits_per_month &&
                              ` · ${sub.visits_per_month}/mo`}
                          </p>
                          {sub.is_first_booking && (
                            <span className="text-[10px] text-[#7c9885] font-bold">
                              1ST BOOKING
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0a1628] whitespace-nowrap">
                          €{Number(sub.final_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={sub.subscription_status ?? "unknown"}
                          />
                          {sub.cancel_at_period_end && (
                            <p className="text-[11px] text-amber-600 font-semibold mt-1">
                              Cancels {fmt(sub.current_period_end)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {sub.canceled_at ? (
                            <span className="text-gray-400">
                              Ended {fmt(sub.canceled_at)}
                            </span>
                          ) : (
                            fmt(sub.current_period_end)
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/bookings/${sub.id}`}
                              className="text-[#7c9885] font-semibold text-[12px] hover:text-[#3d6b47] transition-colors whitespace-nowrap"
                            >
                              View →
                            </Link>
                            {sub.subscription_status === "active" && (
                              <SubscriptionActions
                                bookingId={sub.id}
                                cancelAtPeriodEnd={
                                  sub.cancel_at_period_end ?? false
                                }
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
