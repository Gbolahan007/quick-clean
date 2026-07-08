// app/admin/(protected)/vouchers/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { FilterSelect, EmptyState } from "@/app/admin/_components/AdminUI";
import { Plus } from "lucide-react";
import { CreateVoucherPanel } from "../../_components/CreateVoucherPanel";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed amount", value: "fixed_amount" },
];

interface SearchParams {
  status?: string;
  type?: string;
  create?: string;
}

async function fetchVouchers(params: SearchParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  let query = supabase
    .from("vouchers")
    .select(
      "id, code, description, discount_type, discount_value, stripe_coupon_id, applicable_services, is_active, max_uses, times_used, max_uses_per_customer, expires_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (params.status === "active") query = query.eq("is_active", true);
  if (params.status === "inactive") query = query.eq("is_active", false);
  if (params.type) query = query.eq("discount_type", params.type);

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/vouchers] Fetch error:", error.message);
    return { vouchers: [], total: 0 };
  }

  return { vouchers: data ?? [], total: count ?? 0 };
}

async function fetchVoucherStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [
    { count: activeCount },
    { count: totalRedemptions },
    { data: discountData },
  ] = await Promise.all([
    supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("voucher_redemptions")
      .select("id", { count: "exact", head: true }),
    supabase.from("voucher_redemptions").select("discount_amount_cents"),
  ]);

  const totalDiscountCents = (discountData ?? []).reduce(
    (s, r) => s + (r.discount_amount_cents ?? 0),
    0,
  );

  return {
    activeCount: activeCount ?? 0,
    totalRedemptions: totalRedemptions ?? 0,
    totalDiscountCents,
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

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function usageBar(used: number, max: number | null): string {
  if (max === null) return "";
  const pct = Math.min(100, Math.round((used / max) * 100));
  return `${pct}%`;
}

export default async function AdminVouchersPage({
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
  const showCreate = params.create === "1";

  const [{ vouchers, total }, stats] = await Promise.all([
    fetchVouchers(params),
    fetchVoucherStats(),
  ]);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
            Vouchers
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/admin/vouchers?create=1"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a1628] text-[13px] font-bold text-white hover:bg-[#1a2a40] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create voucher
        </Link>
      </div>

      {/* ── Create panel (slides in when ?create=1) ──────────────────── */}
      {showCreate && <CreateVoucherPanel />}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active vouchers", value: stats.activeCount },
          { label: "Total redemptions", value: stats.totalRedemptions },
          {
            label: "Total discount given",
            value: `€${(stats.totalDiscountCents / 100).toFixed(0)}`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-200 px-5 py-4"
          >
            <p className="text-[22px] font-extrabold text-[#0a1628]">
              {s.value}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <FilterSelect
          paramName="status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          paramName="type"
          placeholder="All types"
          options={TYPE_OPTIONS}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {vouchers.length === 0 ? (
          <EmptyState message="No vouchers found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    "Code",
                    "Description",
                    "Discount",
                    "Usage",
                    "Expires",
                    "Status",
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
                {vouchers.map((v) => {
                  const expired = isExpired(v.expires_at);
                  const exhausted =
                    v.max_uses !== null && v.times_used >= v.max_uses;
                  const effectivelyInactive =
                    !v.is_active || expired || exhausted;

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-gray-50 transition-colors ${effectivelyInactive ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[#0a1628] text-[12px]">
                          {v.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-45 truncate">
                        {v.description ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-[#0a1628]">
                          {v.discount_type === "percentage"
                            ? `${v.discount_value}%`
                            : `€${v.discount_value}`}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-1">
                          {v.discount_type === "percentage" ? "off" : "fixed"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#0a1628] whitespace-nowrap">
                            {v.times_used}
                            {v.max_uses !== null && ` / ${v.max_uses}`}
                          </span>
                          {v.max_uses !== null && (
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#7c9885]"
                                style={{
                                  width: usageBar(v.times_used, v.max_uses),
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Max {v.max_uses_per_customer}/customer
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {v.expires_at ? (
                          <span
                            className={
                              expired
                                ? "text-red-500 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {fmt(v.expires_at)}
                            {expired && " (expired)"}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {exhausted ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                            Exhausted
                          </span>
                        ) : expired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                            Expired
                          </span>
                        ) : v.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f0f8f3] text-[#3d6b47]">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/vouchers/${v.id}`}
                          className="text-[#7c9885] font-semibold text-[12px] hover:text-[#3d6b47] transition-colors whitespace-nowrap"
                        >
                          View →
                        </Link>
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
