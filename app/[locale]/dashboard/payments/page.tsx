import { createServerClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

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
      bookings ( plan_label, service_type, frequency )
    `,
    )
    .order("paid_at", { ascending: false });

  if (error) {
    console.error("[dashboard/payments] Fetch error:", error.message);
  }

  const totalCollected =
    payments
      ?.filter((p) => p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount_cents, 0) ?? 0;

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
        {totalCollected > 0 && (
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Total paid
            </p>
            <p className="text-[20px] font-extrabold text-[#0a1628]">
              €{(totalCollected / 100).toFixed(2)}
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
                      {payment.visits_covered && (
                        <>
                          {" "}
                          · {payment.visits_covered} visit
                          {payment.visits_covered > 1 ? "s" : ""}
                        </>
                      )}
                    </p>
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
