import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { BarChart, ReportStatCard } from "@/app/admin/_components/Charts";
import { DateRangePicker } from "@/app/admin/_components/DateRangePicker";

// ── Default date range: last 30 days ─────────────────────────────────────────

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

interface SearchParams {
  from?: string;
  to?: string;
}

// ── Service client ─────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchRevenueData(from: string, to: string) {
  const supabase = getServiceClient();

  const fromTs = `${from}T00:00:00Z`;
  const toTs = `${to}T23:59:59Z`;

  const [{ data: payments }, { data: refunds }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents, paid_at, status")
      .eq("status", "succeeded")
      .gte("paid_at", fromTs)
      .lte("paid_at", toTs)
      .order("paid_at", { ascending: true }),

    supabase
      .from("payments")
      .select("amount_cents, refunded_at")
      .in("status", ["refunded", "partially_refunded"])
      .gte("refunded_at", fromTs)
      .lte("refunded_at", toTs),
  ]);

  // Group revenue by day
  const dayMap: Record<string, number> = {};
  (payments ?? []).forEach((p) => {
    const day = p.paid_at?.slice(0, 10) ?? "";
    dayMap[day] = (dayMap[day] ?? 0) + p.amount_cents;
  });

  // Build daily series between from and to
  const days: { label: string; value: number }[] = [];
  const cursor = new Date(from);
  const end = new Date(to);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      label: cursor.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      value: Math.round((dayMap[key] ?? 0) / 100),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalRevenueCents = (payments ?? []).reduce(
    (s, p) => s + p.amount_cents,
    0,
  );
  const totalRefundedCents = (refunds ?? []).reduce(
    (s, p) => s + p.amount_cents,
    0,
  );
  const netRevenueCents = totalRevenueCents - totalRefundedCents;
  const paymentCount = (payments ?? []).length;
  const avgOrderCents =
    paymentCount > 0 ? Math.round(totalRevenueCents / paymentCount) : 0;

  return {
    days,
    totalRevenueCents,
    netRevenueCents,
    totalRefundedCents,
    paymentCount,
    avgOrderCents,
    sparkline: days.slice(-14).map((d) => d.value),
  };
}

async function fetchCustomerData(from: string, to: string) {
  const supabase = getServiceClient();
  const fromTs = `${from}T00:00:00Z`;
  const toTs = `${to}T23:59:59Z`;

  const [
    { data: newCustomers },
    { count: authCount },
    { count: guestCount },
    { data: firstBookings },
    { count: activeSubCount },
  ] = await Promise.all([
    // New customers in range
    supabase
      .from("customers")
      .select("id, created_at, auth_user_id")
      .gte("created_at", fromTs)
      .lte("created_at", toTs)
      .order("created_at", { ascending: true }),

    // Total authenticated customers (all time)
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .not("auth_user_id", "is", null),

    // Total guest customers (all time)
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .is("auth_user_id", null),

    // First-booking discount conversions in range
    supabase
      .from("bookings")
      .select("id, created_at")
      .eq("is_first_booking", true)
      .eq("status", "confirmed")
      .gte("created_at", fromTs)
      .lte("created_at", toTs),

    // Active subscriptions (all time)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active"),
  ]);

  // Group new customers by day
  const dayMap: Record<string, number> = {};
  (newCustomers ?? []).forEach((c) => {
    const day = c.created_at?.slice(0, 10) ?? "";
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  });

  const cursor = new Date(from);
  const end = new Date(to);
  const days: { label: string; value: number }[] = [];

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      label: cursor.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      value: dayMap[key] ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const newCount = newCustomers?.length ?? 0;
  const authConversionPct =
    (authCount ?? 0) + (guestCount ?? 0) > 0
      ? Math.round(
          ((authCount ?? 0) / ((authCount ?? 0) + (guestCount ?? 0))) * 100,
        )
      : 0;

  return {
    days,
    newCount,
    authCount: authCount ?? 0,
    guestCount: guestCount ?? 0,
    authConversionPct,
    firstBookingCount: firstBookings?.length ?? 0,
    activeSubCount: activeSubCount ?? 0,
    sparkline: days.slice(-14).map((d) => d.value),
  };
}

async function fetchVoucherReportData(from: string, to: string) {
  const supabase = getServiceClient();
  const fromTs = `${from}T00:00:00Z`;
  const toTs = `${to}T23:59:59Z`;

  const [{ data: redemptions }, { data: vouchers }] = await Promise.all([
    supabase
      .from("voucher_redemptions")
      .select(
        "voucher_id, discount_amount_cents, final_amount_cents, redeemed_at",
      )
      .gte("redeemed_at", fromTs)
      .lte("redeemed_at", toTs),

    supabase
      .from("vouchers")
      .select("id, code, times_used, discount_type, discount_value")
      .order("times_used", { ascending: false })
      .limit(10),
  ]);

  const totalDiscountCents = (redemptions ?? []).reduce(
    (s, r) => s + (r.discount_amount_cents ?? 0),
    0,
  );

  // Redemptions per voucher
  const voucherUsage: Record<string, number> = {};
  (redemptions ?? []).forEach((r) => {
    voucherUsage[r.voucher_id] = (voucherUsage[r.voucher_id] ?? 0) + 1;
  });

  const topVouchers = (vouchers ?? [])
    .map((v) => ({
      label: v.code,
      value: v.times_used,
    }))
    .slice(0, 8);

  return {
    totalRedemptions: redemptions?.length ?? 0,
    totalDiscountCents,
    topVouchers,
    uniqueVouchersUsed: Object.keys(voucherUsage).length,
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtEur(cents: number): string {
  return `€${(cents / 100).toLocaleString("en-FI", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AdminReportsPage({
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
  const range = {
    from: params.from ?? defaultRange().from,
    to: params.to ?? defaultRange().to,
  };

  const [revenue, customers, vouchers] = await Promise.all([
    fetchRevenueData(range.from, range.to),
    fetchCustomerData(range.from, range.to),
    fetchVoucherReportData(range.from, range.to),
  ]);

  // Reduce daily data for chart when range > 60 days (aggregate weekly)
  function reduceDays(days: { label: string; value: number }[], maxBars = 30) {
    if (days.length <= maxBars) return days;
    const step = Math.ceil(days.length / maxBars);
    return days.filter((_, i) => i % step === 0);
  }

  const revenueDays = reduceDays(revenue.days);
  const customerDays = reduceDays(customers.days);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── Header + date range ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
            Reports
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {range.from} → {range.to}
          </p>
        </div>
        <DateRangePicker from={range.from} to={range.to} />
      </div>

      {/* ═══ REVENUE ════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-[14px] font-bold text-[#0a1628] uppercase tracking-wider">
          Revenue
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportStatCard
            label="Gross revenue"
            value={fmtEur(revenue.totalRevenueCents)}
            subtitle="succeeded payments"
            trend={revenue.sparkline}
            color="text-[#3d6b47]"
          />
          <ReportStatCard
            label="Net revenue"
            value={fmtEur(revenue.netRevenueCents)}
            subtitle="after refunds"
          />
          <ReportStatCard
            label="Payments"
            value={revenue.paymentCount}
            subtitle="successful transactions"
          />
          <ReportStatCard
            label="Avg. order"
            value={fmtEur(revenue.avgOrderCents)}
            subtitle="per transaction"
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-4">
            Daily revenue (€)
          </p>
          {revenueDays.every((d) => d.value === 0) ? (
            <p className="text-[13px] text-gray-400 text-center py-8">
              No revenue in this period
            </p>
          ) : (
            <BarChart
              data={revenueDays}
              height={180}
              color="#7c9885"
              formatValue={(v) => `€${v}`}
            />
          )}
        </div>

        {revenue.totalRefundedCents > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
            <p className="text-[13px] text-blue-800">
              <span className="font-bold">
                {fmtEur(revenue.totalRefundedCents)}
              </span>{" "}
              refunded in this period ·{" "}
              <span className="font-bold">
                {Math.round(
                  (revenue.totalRefundedCents / revenue.totalRevenueCents) *
                    100,
                )}
                %
              </span>{" "}
              refund rate
            </p>
          </div>
        )}
      </section>

      {/* ═══ CUSTOMERS ══════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-[14px] font-bold text-[#0a1628] uppercase tracking-wider">
          Customers
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportStatCard
            label="New customers"
            value={customers.newCount}
            subtitle="in selected period"
            trend={customers.sparkline}
            color="text-[#0a1628]"
          />
          <ReportStatCard
            label="Auth conversion"
            value={`${customers.authConversionPct}%`}
            subtitle="guests who created accounts"
          />
          <ReportStatCard
            label="First-booking discounts"
            value={customers.firstBookingCount}
            subtitle="new customers converted"
          />
          <ReportStatCard
            label="Active subscribers"
            value={customers.activeSubCount}
            subtitle="all time"
            color="text-purple-700"
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-4">
            New customers per day
          </p>
          {customerDays.every((d) => d.value === 0) ? (
            <p className="text-[13px] text-gray-400 text-center py-8">
              No new customers in this period
            </p>
          ) : (
            <BarChart
              data={customerDays}
              height={140}
              color="#0a1628"
              formatValue={String}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Account status (all time)
            </p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[20px] font-extrabold text-[#3d6b47]">
                  {customers.authCount}
                </p>
                <p className="text-[12px] text-gray-400">Authenticated</p>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div>
                <p className="text-[20px] font-extrabold text-gray-400">
                  {customers.guestCount}
                </p>
                <p className="text-[12px] text-gray-400">Guest only</p>
              </div>
              {/* Visual ratio bar */}
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#7c9885]"
                  style={{ width: `${customers.authConversionPct}%` }}
                />
              </div>
              <span className="text-[12px] font-bold text-[#7c9885]">
                {customers.authConversionPct}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Subscription health
            </p>
            <p className="text-[20px] font-extrabold text-purple-700">
              {customers.activeSubCount}
            </p>
            <p className="text-[12px] text-gray-400">Active subscriptions</p>
            <p className="text-[11px] text-gray-300 mt-1">
              Est. MRR: {fmtEur(customers.activeSubCount * 8900)} (avg €89/mo)
            </p>
          </div>
        </div>
      </section>

      {/* ═══ VOUCHERS ═══════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-[14px] font-bold text-[#0a1628] uppercase tracking-wider">
          Vouchers
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportStatCard
            label="Redemptions"
            value={vouchers.totalRedemptions}
            subtitle="in selected period"
          />
          <ReportStatCard
            label="Total discount given"
            value={fmtEur(vouchers.totalDiscountCents)}
            subtitle="revenue impact"
            color="text-blue-700"
          />
          <ReportStatCard
            label="Unique vouchers used"
            value={vouchers.uniqueVouchersUsed}
          />
        </div>

        {vouchers.topVouchers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              Top vouchers by usage (all time)
            </p>
            <BarChart
              data={vouchers.topVouchers}
              height={140}
              color="#3b82f6"
              formatValue={String}
            />
          </div>
        )}
      </section>
    </div>
  );
}
