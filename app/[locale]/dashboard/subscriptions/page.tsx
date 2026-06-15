// app/[locale]/dashboard/subscriptions/page.tsx

import { createServerClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionActions } from "./SubscriptionActions";

interface PageProps {
  params: Promise<{ locale: string }>;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function SubscriptionsPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // RLS scopes to authenticated customer's bookings only
  const { data: subscriptions, error } = await supabase
    .from("bookings")
    .select(
      `
      id, plan_label, frequency, service_type,
      subscription_status, payment_status,
      current_period_start, current_period_end,
      cancel_at_period_end, canceled_at,
      final_price, visits_per_month,
      office_name, weekly_hours,
      stripe_subscription_id
    `,
    )
    .neq("frequency", "one-time")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard/subscriptions] Fetch error:", error.message);
  }

  const active =
    subscriptions?.filter((s) => s.subscription_status === "active") ?? [];
  const inactive =
    subscriptions?.filter((s) => s.subscription_status !== "active") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Subscriptions
        </h1>
        <p className="text-[14px] text-[#0a1628]/50 mt-1">
          Manage your recurring cleaning contracts.
        </p>
      </div>

      {(!subscriptions || subscriptions.length === 0) && (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center">
          <p className="text-[14px] text-gray-400">No active subscriptions.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-400">
            Active
          </h2>
          {active.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-[#d4e8d9] bg-white overflow-hidden"
            >
              <div className="bg-[#f0f8f3] px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-[#0a1628]">
                    {sub.plan_label ?? "Subscription"}
                  </p>
                  {sub.office_name && (
                    <p className="text-[11px] text-[#0a1628]/50">
                      {sub.office_name}
                    </p>
                  )}
                </div>
                <span
                  className={[
                    "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
                    sub.cancel_at_period_end
                      ? "bg-amber-100 text-amber-700"
                      : "bg-[#7c9885] text-white",
                  ].join(" ")}
                >
                  {sub.cancel_at_period_end ? "Cancelling" : "Active"}
                </span>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow
                    label="Monthly charge"
                    value={`€${Number(sub.final_price).toFixed(2)}`}
                  />
                  <InfoRow label="Frequency" value={sub.frequency} />
                  {sub.visits_per_month && (
                    <InfoRow
                      label="Visits/month"
                      value={String(sub.visits_per_month)}
                    />
                  )}
                  {sub.weekly_hours && (
                    <InfoRow
                      label="Weekly hours"
                      value={`${sub.weekly_hours}h`}
                    />
                  )}
                  <InfoRow
                    label="Period start"
                    value={formatDate(sub.current_period_start)}
                  />
                  <InfoRow
                    label={
                      sub.cancel_at_period_end ? "Cancels on" : "Next billing"
                    }
                    value={formatDate(sub.current_period_end)}
                    highlight={sub.cancel_at_period_end}
                  />
                </div>

                {sub.cancel_at_period_end && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <p className="text-[12px] text-amber-700">
                      Your subscription will cancel on{" "}
                      {formatDate(sub.current_period_end)}. You can reactivate
                      it before then.
                    </p>
                  </div>
                )}

                {/* Client component handles cancel/reactivate interactions */}
                <SubscriptionActions
                  bookingId={sub.id}
                  cancelAtPeriodEnd={sub.cancel_at_period_end ?? false}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-400">
            Past
          </h2>
          {inactive.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-gray-100 bg-white px-5 py-4 opacity-60"
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[#0a1628]">
                  {sub.plan_label ?? "Subscription"}
                </p>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
                  {sub.subscription_status ?? "Ended"}
                </span>
              </div>
              {sub.canceled_at && (
                <p className="text-[12px] text-gray-400 mt-1">
                  Ended {formatDate(sub.canceled_at)}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p
        className={[
          "text-[13px] font-semibold mt-0.5",
          highlight ? "text-amber-700" : "text-[#0a1628]",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
