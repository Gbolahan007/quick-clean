import { MagicLinkCTA } from "@/app/components/MagicLinkCTA";
import { StoreCleaner } from "@/app/components/StoreCleaner";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight, Calendar, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string; booking_id?: string }>;
}

// ── Server-side booking fetch ─────────────────────────────────────────────────

async function getBookingDetails(bookingId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      payment_status,
      service_type,
      plan_label,
      frequency,
      booking_date,
      time_slot,
      final_price,
      show_deducted,
      apartment_size,
      visits_per_month,
      customers ( full_name, email )
    `,
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) return null;
  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? timeStr;
}

function frequencyLabel(frequency: string): string {
  const map: Record<string, string> = {
    "one-time": "One-time visit",
    weekly: "Weekly · 4 visits/month",
    biweekly: "Bi-weekly · 2 visits/month",
    monthly: "Monthly · 1 visit/month",
    deepMonthly: "Monthly deep clean",
    deepQuarterly: "Quarterly deep clean",
  };
  return map[frequency] ?? frequency;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BookingSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { booking_id, session_id } = await searchParams;

  // Guard: both params must be present
  if (!booking_id || !session_id) {
    redirect(`/${locale}/pricing`);
  }

  const booking = await getBookingDetails(booking_id);

  const isConfirmed =
    booking?.status === "confirmed" && booking?.payment_status === "paid";
  const isPending = booking?.status === "pending";

  if (!booking) {
    redirect(`/${locale}/pricing`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = booking.customers as any;
  const ref = booking_id.slice(0, 8).toUpperCase();

  return (
    <main className="min-h-screen bg-[#f8faf9] flex items-start justify-center px-5 py-24">
      <StoreCleaner storeKeys={["booking-store"]} />
      <div className="w-full max-w-lg space-y-6">
        {/* ── Status header ──────────────────────────────────────────────── */}
        {isConfirmed ? (
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#f0f8f3] flex items-center justify-center">
                <CheckCircle
                  className="w-8 h-8 text-[#7c9885]"
                  strokeWidth={1.8}
                />
              </div>
            </div>
            <h1 className="text-[28px] font-extrabold text-[#0a1628] tracking-tight">
              You&apos;re booked!
            </h1>
            <p className="text-[15px] text-[#0a1628]/55">
              Confirmation sent to{" "}
              <span className="font-semibold text-[#0a1628]">
                {customer?.email}
              </span>
            </p>
          </div>
        ) : (
          // Webhook hasn't fired yet — very rare, show pending state
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8 text-amber-500" strokeWidth={1.8} />
              </div>
            </div>
            <h1 className="text-[26px] font-extrabold text-[#0a1628] tracking-tight">
              Payment received
            </h1>
            <p className="text-[14px] text-[#0a1628]/55 max-w-xs mx-auto">
              We&apos;re confirming your booking — this usually takes a few
              seconds. You&apos;ll receive a confirmation email shortly.
            </p>
          </div>
        )}

        {/* ── Booking reference ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#d4e8d9] bg-[#f0f8f3] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7c9885]">
              Booking reference
            </p>
            <p className="text-[18px] font-extrabold font-mono text-[#0a1628] mt-0.5">
              #{ref}
            </p>
          </div>
          {isConfirmed && (
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#7c9885] text-white uppercase tracking-wide">
              Confirmed
            </span>
          )}
          {isPending && (
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">
              Processing
            </span>
          )}
        </div>

        {/* ── Booking details ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
              Booking details
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Service */}
            <div className="px-5 py-3.5 flex items-start gap-3">
              <CheckCircle
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Service</p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {booking.plan_label}
                </p>
                <p className="text-[12px] text-[#0a1628]/50 mt-0.5">
                  {frequencyLabel(booking.frequency)}
                  {booking.apartment_size && ` · ${booking.apartment_size}`}
                </p>
              </div>
            </div>

            {/* Date & time */}
            <div className="px-5 py-3.5 flex items-start gap-3">
              <Calendar
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  First visit
                </p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {formatDate(booking.booking_date)}
                </p>
                <p className="text-[12px] text-[#0a1628]/50 mt-0.5">
                  {formatTime(booking.time_slot)}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="px-5 py-3.5 flex items-start gap-3">
              <Clock
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  {booking.frequency === "one-time"
                    ? "Total"
                    : "Monthly charge"}
                </p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  €{Number(booking.final_price).toFixed(2)}
                  <span className="text-[12px] font-normal text-gray-400 ml-1">
                    incl. VAT 25.5%
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── What happens next ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 space-y-3">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            What happens next
          </p>
          {[
            "You'll receive a confirmation email with full booking details.",
            "Our team will reach out 24 hours before your visit to confirm access.",
            "After the clean, you'll get a brief satisfaction survey.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-[#7c9885] font-bold text-[12px] shrink-0 mt-0.5">
                {i + 1}.
              </span>
              <p className="text-[13px] text-[#0a1628]/65 leading-relaxed">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-[14px] font-semibold text-[#0a1628] hover:border-gray-300 transition-colors"
          >
            Go to homepage
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#7c9885] text-[14px] font-semibold text-white hover:bg-[#6f8c78] transition-colors"
          >
            Book another clean
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Create account CTA ──────────────────────────────────────────── */}
        <MagicLinkCTA bookingEmail={customer?.email} locale={locale} />

        {/* ── Support line ────────────────────────────────────────────────── */}
        <p className="text-center text-[12px] text-gray-400">
          Questions?{" "}
          <a
            href="mailto:hello@quickclean.fi"
            className="text-[#7c9885] font-medium hover:underline"
          >
            hello@quickclean.fi
          </a>
        </p>
      </div>
    </main>
  );
}
