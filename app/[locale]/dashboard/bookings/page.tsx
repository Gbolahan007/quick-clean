import { createServerClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookingList } from "./BookingList";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function BookingsPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id, status, payment_status, frequency,
      booking_date, time_slot, final_price,
      plan_label, apartment_size, service_type,
      office_name, weekly_hours,
      current_period_start, current_period_end, cancel_at_period_end,
      subscription_status, visits_per_month,
      addons_snapshot, special_notes,
      stripe_subscription_id
      `,
    )
    .order("booking_date", { ascending: false });

  if (error) {
    console.error("[dashboard/bookings] Fetch error:", error.message);
  }

  const now = new Date();
  const upcoming =
    bookings?.filter(
      (b) => new Date(b.booking_date) >= now && b.status !== "cancelled",
    ) ?? [];
  const past =
    bookings?.filter(
      (b) => new Date(b.booking_date) < now || b.status === "cancelled",
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

      <BookingList upcoming={upcoming} past={past} locale={locale} />
    </div>
  );
}
