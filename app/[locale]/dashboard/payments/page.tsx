import { createServerClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

// ── Duration lookup (hours per visit) ─────────────────────────────────────────
// Source: QuickClean pricing document — exact durations per service + apartment.

const MAINTENANCE_HOURS: Record<string, number> = {
  studio: 1.5,
  two: 2.0,
  three: 3.0,
  four: 4.0,
};

const DEEP_HOURS: Record<string, number> = {
  studio: 2.5,
  two: 3.5,
  three: 5.0,
  four: 6.0,
};

function getVisitDurationHours(
  serviceType: string | null,
  apartmentKey: string | null,
  estimatedHours: number | null,
): number {
  // Office: duration is the weekly contracted hours per visit
  if (serviceType === "office" && estimatedHours) return estimatedHours;

  const apt = (apartmentKey ?? "studio").toLowerCase();

  if (serviceType === "deep") return DEEP_HOURS[apt] ?? 2.5;
  if (serviceType === "moveout") return DEEP_HOURS[apt] ?? 2.5; // same effort as deep
  return MAINTENANCE_HOURS[apt] ?? 1.5; // maintenance + fallback
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    succeeded: "bg-[#f0f8f3] text-[#3d6b47]",
    failed: "bg-red-50 text-red-600",
    refunded: "bg-blue-50 text-blue-600",
    partially_refunded: "bg-amber-50 text-amber-700",
    pending: "bg-gray-100 text-gray-500",
  };
  return map[status] ?? "bg-gray-100 text-gray-500";
}

function formatHours(totalHours: number): string {
  if (totalHours < 1) return `${Math.round(totalHours * 60)} mins`;
  const whole = Math.floor(totalHours);
  const mins = Math.round((totalHours - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function PaymentsPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // RLS: payments → bookings → customers → auth_user_id = auth.uid()
  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      `
      id, amount_cents, currency, status,
      paid_at, refunded_at, stripe_invoice_id,
      billing_period_start, billing_period_end,
      visits_covered, is_first_payment, failure_message,
      bookings ( plan_label, service_type, frequency, apartment_key, estimated_hours )
    `,
    )
    .order("paid_at", { ascending: false });

  // ── Resolve effective visit count per payment ─────────────────────────────
  // visits_covered is only set by the invoice.paid webhook (subscriptions).
  // For one-time and moveout payments it is null — default to 1 visit.

  if (error) {
    console.error("[dashboard/payments] Fetch error:", error.message);
  }

  // ── Calculate total hours saved across all succeeded payments ─────────────
  const ONE_TIME_FREQUENCIES = new Set(["one-time", "deepOnetime", "moveout"]);

  function resolveVisits(
    visitsCovered: number | null,
    frequency: string | null,
  ): number {
    // Subscriptions: use visits_covered from invoice.paid webhook
    if (visitsCovered != null && visitsCovered > 0) return visitsCovered;
    // One-time bookings: visits_covered is never set — always 1 visit
    if (frequency && ONE_TIME_FREQUENCIES.has(frequency)) return 1;
    // Fallback: avoid counting zero
    return visitsCovered ?? 0;
  }

  const totalHoursSaved =
    payments
      ?.filter((p) => p.status === "succeeded")
      .reduce((sum, p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const booking = p.bookings as any;
        const visits = resolveVisits(
          p.visits_covered,
          booking?.frequency ?? null,
        );
        if (visits === 0) return sum;
        const hoursPerVisit = getVisitDurationHours(
          booking?.service_type ?? null,
          booking?.apartment_key ?? null,
          booking?.estimated_hours ?? null,
        );
        return sum + hoursPerVisit * visits;
      }, 0) ?? 0;

  const totalVisits =
    payments
      ?.filter((p) => p.status === "succeeded")
      .reduce((sum, p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const booking = p.bookings as any;
        return (
          sum + resolveVisits(p.visits_covered, booking?.frequency ?? null)
        );
      }, 0) ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
            Payments
          </h1>
          <p className="text-[14px] text-[#0a1628]/50 mt-1">
            Your complete payment history.
          </p>
        </div>

        {/* ── Time saved stat ─────────────────────────────────────────────── */}
        {totalHoursSaved > 0 && (
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Time saved
            </p>
            <p className="text-[20px] font-extrabold text-[#0a1628]">
              {formatHours(totalHoursSaved)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              across {totalVisits} clean{totalVisits !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {!payments || payments.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center">
          <p className="text-[14px] text-gray-400">No payment history yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const booking = payment.bookings as any;

              // Per-payment hours saved (shown inline on each row)
              const visits = resolveVisits(
                payment.visits_covered,
                booking?.frequency ?? null,
              );
              const hoursPerVisit =
                visits > 0
                  ? getVisitDurationHours(
                      booking?.service_type ?? null,
                      booking?.apartment_key ?? null,
                      booking?.estimated_hours ?? null,
                    )
                  : 0;
              const rowHours = hoursPerVisit * visits;

              return (
                <div
                  key={payment.id}
                  className="px-5 py-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0a1628]">
                      {booking?.plan_label ?? "Payment"}
                    </p>
                    <p className="text-[12px] text-[#0a1628]/50">
                      {formatDate(payment.paid_at)}
                      {payment.billing_period_start &&
                        payment.billing_period_end && (
                          <>
                            {" "}
                            · {formatDate(payment.billing_period_start)} –{" "}
                            {formatDate(payment.billing_period_end)}
                          </>
                        )}
                      {visits > 0 && (
                        <>
                          {" "}
                          · {visits} clean{visits > 1 ? "s" : ""}
                        </>
                      )}
                    </p>

                    {/* Hours saved per payment row */}
                    {rowHours > 0 && payment.status === "succeeded" && (
                      <p className="text-[11px] font-semibold text-[#7c9885]">
                        🕒 {formatHours(rowHours)} saved
                      </p>
                    )}

                    {payment.status === "failed" && payment.failure_message && (
                      <p className="text-[11px] text-red-600">
                        {payment.failure_message}
                      </p>
                    )}
                    {payment.status === "refunded" && payment.refunded_at && (
                      <p className="text-[11px] text-blue-600">
                        Refunded {formatDate(payment.refunded_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={[
                        "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
                        statusBadge(payment.status),
                      ].join(" ")}
                    >
                      {payment.status === "partially_refunded"
                        ? "Part refunded"
                        : payment.status}
                    </span>
                    <p className="text-[13px] font-bold text-[#0a1628]">
                      €{(payment.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
