import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import {
  Calendar,
  Users,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

// ── Service client ─────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Data fetching ──────────────────────────────────────────────────────────

async function fetchDashboardKPIs() {
  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    { count: todayBookings },
    { count: pendingBookings },
    { data: revenueData },
    { count: activeSubscriptions },
    { count: failedPayments },
    { count: newCustomers },
    { data: recentActivity },
  ] = await Promise.all([
    // Today's confirmed bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_date", today)
      .eq("status", "confirmed"),

    // Pending bookings (unpaid)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "pending"),

    // Revenue this month
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("status", "succeeded")
      .gte("paid_at", monthAgo + "T00:00:00Z"),

    // Active subscriptions
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active"),

    // Failed payments (last 7 days)
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ),

    // New customers this month
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo + "T00:00:00Z"),

    // Recent audit log
    supabase
      .from("admin_audit_log")
      .select("id, action, entity_type, entity_id, admin_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const monthlyRevenueCents = (revenueData ?? []).reduce(
    (sum, p) => sum + (p.amount_cents ?? 0),
    0,
  );

  return {
    todayBookings: todayBookings ?? 0,
    pendingBookings: pendingBookings ?? 0,
    monthlyRevenueCents,
    activeSubscriptions: activeSubscriptions ?? 0,
    failedPayments: failedPayments ?? 0,
    newCustomers: newCustomers ?? 0,
    recentActivity: recentActivity ?? [],
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────

function formatEur(cents: number): string {
  return `€${(cents / 100).toLocaleString("en-FI", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatAction(action: string): string {
  return action.replace(".", " › ").replace(/_/g, " ");
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const kpis = await fetchDashboardKPIs();

  const kpiCards = [
    {
      label: "Today's bookings",
      value: kpis.todayBookings,
      icon: Calendar,
      color: "text-[#7c9885]",
      bg: "bg-[#f0f8f3]",
    },
    {
      label: "Monthly revenue",
      value: formatEur(kpis.monthlyRevenueCents),
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active subscriptions",
      value: kpis.activeSubscriptions,
      icon: RefreshCw,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "New customers (30d)",
      value: kpis.newCustomers,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Dashboard
        </h1>
        <p className="text-[13px] text-gray-400 mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────── */}
      {(kpis.pendingBookings > 0 || kpis.failedPayments > 0) && (
        <div className="space-y-2">
          {kpis.pendingBookings > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-[13px] text-amber-800">
                <strong>{kpis.pendingBookings}</strong> booking
                {kpis.pendingBookings !== 1 ? "s" : ""} pending payment
              </p>
            </div>
          )}
          {kpis.failedPayments > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <CreditCard className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[13px] text-red-800">
                <strong>{kpis.failedPayments}</strong> failed payment
                {kpis.failedPayments !== 1 ? "s" : ""} in the last 7 days
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-200 p-5"
            >
              <div
                className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}
              >
                <Icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <p className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
                {card.value}
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Recent activity ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            Recent activity
          </p>
        </div>

        {kpis.recentActivity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-gray-400">No activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {kpis.recentActivity.map((event) => (
              <div
                key={event.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c9885] shrink-0" />
                  <p className="text-[13px] text-[#0a1628] truncate">
                    {formatAction(event.action)}
                    {event.entity_id && (
                      <span className="text-gray-400 ml-1.5 font-mono text-[11px]">
                        #{(event.entity_id as string).slice(0, 8)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {timeAgo(event.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
