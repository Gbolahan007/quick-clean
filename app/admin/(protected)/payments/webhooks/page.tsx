import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { ArrowLeft, AlertTriangle } from "lucide-react";

async function fetchFailedWebhooks() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select(
      "id, stripe_event_id, event_type, processed, processing_error, related_booking_id, received_at, processed_at",
    )
    .or("processing_error.not.is.null,processed.eq.false")
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/webhooks] Fetch error:", error.message);
    return [];
  }

  return data ?? [];
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function WebhooksPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const events = await fetchFailedWebhooks();

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-[#0a1628] transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to payments
        </Link>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Webhook events
        </h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Failed or unprocessed Stripe webhook events
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-[#f0f8f3] border border-[#d4e8d9] rounded-2xl px-6 py-8 text-center">
          <p className="text-[14px] font-semibold text-[#3d6b47]">
            All webhooks processed successfully ✓
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className={[
                "rounded-2xl border bg-white overflow-hidden",
                e.processing_error ? "border-red-200" : "border-amber-200",
              ].join(" ")}
            >
              <div
                className={[
                  "px-5 py-3 flex items-center justify-between gap-4",
                  e.processing_error ? "bg-red-50" : "bg-amber-50",
                ].join(" ")}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${e.processing_error ? "text-red-500" : "text-amber-500"}`}
                  />
                  <div>
                    <p className="text-[13px] font-bold text-[#0a1628]">
                      {e.event_type}
                    </p>
                    <p className="text-[11px] font-mono text-gray-400">
                      {e.stripe_event_id}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={[
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide",
                      e.processing_error
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {e.processing_error ? "Error" : "Unprocessed"}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {fmt(e.received_at)}
                  </p>
                </div>
              </div>
              {e.processing_error && (
                <div className="px-5 py-3 border-t border-red-100">
                  <p className="text-[12px] text-red-700 font-mono break-all">
                    {e.processing_error}
                  </p>
                </div>
              )}
              {e.related_booking_id && (
                <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[12px] text-gray-400">
                    Related booking:{" "}
                    <span className="font-mono">
                      {e.related_booking_id.slice(0, 8).toUpperCase()}
                    </span>
                  </p>
                  <Link
                    href={`/admin/bookings/${e.related_booking_id}`}
                    className="text-[12px] font-semibold text-[#7c9885] hover:text-[#3d6b47] transition-colors"
                  >
                    View booking →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
