import { createServerClient } from "@/app/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    confirmed: "bg-[#f0f8f3] text-[#3d6b47]",
    pending: "bg-amber-50 text-amber-700",
    completed: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-50 text-red-600",
  };
  return styles[status] ?? "bg-gray-100 text-gray-500";
}

export default async function BookingsPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // RLS: returns only bookings belonging to the authenticated customer
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id, status, payment_status, frequency,
      booking_date, time_slot, final_price,
      plan_label, apartment_size, service_type,
      office_name, weekly_hours,
      current_period_end, cancel_at_period_end,
      subscription_status
    `,
    )
    .order("booking_date", { ascending: false });

  if (error) {
    console.error("[dashboard/bookings] Fetch error:", error.message);
  }

  const upcoming =
    bookings?.filter(
      (b) => new Date(b.booking_date) >= new Date() && b.status !== "cancelled",
    ) ?? [];
  const past =
    bookings?.filter(
      (b) => new Date(b.booking_date) < new Date() || b.status === "cancelled",
    ) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Bookings
        </h1>
        <p className="text-[14px] text-[#0a1628]/50 mt-1">
          Your upcoming and past cleaning visits.
        </p>
      </div>

      {/* ── Upcoming ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-400">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center">
            <p className="text-[14px] text-gray-400">No upcoming bookings.</p>
            <Link
              href={`/${locale}/pricing`}
              className="mt-3 inline-block px-4 py-2 rounded-xl bg-[#7c9885] text-[13px] font-semibold text-white hover:bg-[#6f8c78] transition-colors"
            >
              Book a clean
            </Link>
          </div>
        ) : (
          upcoming.map((booking) => (
            <BookingCard key={booking.id} booking={booking} locale={locale} />
          ))
        )}
      </section>

      {/* ── Past ─────────────────────────────────────────────────────────── */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-400">
            History
          </h2>
          {past.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              locale={locale}
              muted
            />
          ))}
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  //   locale,
  muted = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  booking: any;
  locale: string;
  muted?: boolean;
}) {
  const isOffice = booking.service_type === "office";

  return (
    <div
      className={[
        "rounded-2xl border bg-white px-5 py-4",
        muted ? "border-gray-100 opacity-70" : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#0a1628] truncate">
            {booking.plan_label ?? (isOffice ? "Office Cleaning" : "Cleaning")}
          </p>
          <p className="text-[12px] text-[#0a1628]/50">
            {formatDate(booking.booking_date)}
            {booking.time_slot && ` · ${booking.time_slot.slice(0, 5)}`}
            {booking.apartment_size && ` · ${booking.apartment_size}`}
            {isOffice && booking.office_name && ` · ${booking.office_name}`}
          </p>
          {booking.cancel_at_period_end && (
            <p className="text-[11px] text-amber-600 font-semibold">
              Cancels on {formatDate(booking.current_period_end)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={[
              "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
              statusBadge(booking.status),
            ].join(" ")}
          >
            {booking.status}
          </span>
          <p className="text-[13px] font-bold text-[#0a1628]">
            €{Number(booking.final_price).toFixed(2)}
            {booking.frequency !== "one-time" && (
              <span className="text-[11px] font-normal text-gray-400">/mo</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
