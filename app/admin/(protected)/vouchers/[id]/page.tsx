import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { DetailRow } from "@/app/admin/_components/AdminUI";
import { ArrowLeft } from "lucide-react";
import { VoucherToggle } from "@/app/admin/_components/VoucherToggle";

async function fetchVoucherDetail(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [{ data: voucher }, { data: redemptions }] = await Promise.all([
    supabase
      .from("vouchers")
      .select(
        "id, code, description, discount_type, discount_value, stripe_coupon_id, applicable_services, is_active, max_uses, times_used, max_uses_per_customer, expires_at, created_at",
      )
      .eq("id", id)
      .single(),

    supabase
      .from("voucher_redemptions")
      .select(
        `
        id, discount_amount_cents, original_amount_cents,
        final_amount_cents, redeemed_at, stripe_session_id,
        customers ( full_name, email ),
        bookings ( id, plan_label, booking_date )
      `,
      )
      .eq("voucher_id", id)
      .order("redeemed_at", { ascending: false }),
  ]);

  return { voucher, redemptions: redemptions ?? [] };
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtEur(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `€${(cents / 100).toFixed(2)}`;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default async function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;
  const { voucher, redemptions } = await fetchVoucherDetail(id);

  if (!voucher) notFound();

  const expired = isExpired(voucher.expires_at);
  const exhausted =
    voucher.max_uses !== null && voucher.times_used >= voucher.max_uses;

  // Aggregated stats from redemptions
  const totalDiscountCents = redemptions.reduce(
    (s, r) => s + (r.discount_amount_cents ?? 0),
    0,
  );
  const totalRevenueCents = redemptions.reduce(
    (s, r) => s + (r.final_amount_cents ?? 0),
    0,
  );

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/vouchers"
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-[#0a1628] transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to vouchers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-extrabold text-[#0a1628] font-mono tracking-tight">
              {voucher.code}
            </h1>
            {expired ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                Expired
              </span>
            ) : exhausted ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                Exhausted
              </span>
            ) : voucher.is_active ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f0f8f3] text-[#3d6b47]">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                Inactive
              </span>
            )}
          </div>
          <p className="text-[14px] text-gray-500 mt-1">
            {voucher.description}
          </p>
        </div>

        {/* Stripe link */}
        <a
          href={`https://dashboard.stripe.com/test/coupons/${voucher.stripe_coupon_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
        >
          View in Stripe ↗
        </a>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Times used",
            value: `${voucher.times_used}${voucher.max_uses ? ` / ${voucher.max_uses}` : ""}`,
          },
          { label: "Total discount", value: fmtEur(totalDiscountCents) },
          { label: "Revenue generated", value: fmtEur(totalRevenueCents) },
          {
            label: "Unique customers",
            value: new Set(
              redemptions.map((r) => {
                const c = Array.isArray(r.customers)
                  ? r.customers[0]
                  : r.customers;
                return c?.email;
              }),
            ).size,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-200 px-5 py-4"
          >
            <p className="text-[20px] font-extrabold text-[#0a1628]">
              {s.value}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Details + toggle ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Details
            </p>
          </div>
          <div className="px-5 py-4">
            <DetailRow
              label="Discount"
              value={
                voucher.discount_type === "percentage"
                  ? `${voucher.discount_value}% off`
                  : `€${voucher.discount_value} off`
              }
            />
            <DetailRow label="Type" value={voucher.discount_type} />
            <DetailRow
              label="Applies to"
              value={
                voucher.applicable_services?.length
                  ? voucher.applicable_services.join(", ")
                  : "All residential services"
              }
            />
            <DetailRow
              label="Max uses"
              value={voucher.max_uses ? String(voucher.max_uses) : "Unlimited"}
            />
            <DetailRow
              label="Max/customer"
              value={String(voucher.max_uses_per_customer)}
            />
            <DetailRow
              label="Expires"
              value={voucher.expires_at ? fmt(voucher.expires_at) : "Never"}
            />
            <DetailRow
              label="Stripe coupon ID"
              value={voucher.stripe_coupon_id}
              mono
            />
            <DetailRow label="Created" value={fmt(voucher.created_at)} />
          </div>
        </div>

        {/* Actions */}
        <VoucherToggle
          voucherId={voucher.id}
          isActive={voucher.is_active}
          isExpired={expired}
          isExhausted={exhausted}
        />
      </div>

      {/* ── Redemption history ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Redemption history ({redemptions.length})
          </p>
        </div>
        {redemptions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-gray-400">No redemptions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    "Customer",
                    "Booking",
                    "Original",
                    "Discount",
                    "Final",
                    "Date",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((r) => {
                  const customerArr = r.customers;
                  const customer = Array.isArray(customerArr)
                    ? customerArr[0]
                    : customerArr;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const booking = r.bookings as any;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#0a1628]">
                          {customer?.full_name ?? "—"}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {customer?.email}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {booking?.id ? (
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="text-[#7c9885] font-semibold hover:text-[#3d6b47] transition-colors"
                          >
                            {booking.plan_label ??
                              booking.id.slice(0, 8).toUpperCase()}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {booking?.booking_date && (
                          <p className="text-[11px] text-gray-400">
                            {fmt(booking.booking_date)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {fmtEur(r.original_amount_cents)}
                      </td>
                      <td className="px-5 py-3 text-[#3d6b47] font-semibold">
                        −{fmtEur(r.discount_amount_cents)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#0a1628]">
                        {fmtEur(r.final_amount_cents)}
                      </td>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                        {fmt(r.redeemed_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
