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

async function getBookingDetails(bookingId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, status, payment_status,
      plan_label, frequency, booking_date, time_slot,
      final_price, office_name, office_size_sqm,
      weekly_hours, estimated_hours, hourly_rate,
      customers ( full_name, email )
    `,
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) return null;
  return data;
}

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

export default async function OfficeBookingSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { booking_id, session_id } = await searchParams;

  if (!booking_id || !session_id) {
    redirect(`/${locale}/pricing/office-cleaning`);
  }

  const booking = await getBookingDetails(booking_id);

  if (!booking) {
    redirect(`/${locale}/pricing/office-cleaning`);
  }

  const isConfirmed =
    booking.status === "confirmed" && booking.payment_status === "paid";
  const isPending = booking.status === "pending";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = booking.customers as any;
  const ref = booking_id.slice(0, 8).toUpperCase();

  return (
    <main className="min-h-screen bg-[#f8faf9] flex items-start justify-center px-5 py-16">
      <StoreCleaner storeKeys={["office-booking-store"]} />
      <div className="w-full max-w-lg space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        {isConfirmed ? (
          <div className="text-center  py-8 space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#f0f8f3] flex items-center justify-center">
                <CheckCircle
                  className="w-8 h-8 text-[#7c9885]"
                  strokeWidth={1.8}
                />
              </div>
            </div>
            <h1 className="text-[28px] font-extrabold text-[#0a1628] tracking-tight">
              Office contract activated!
            </h1>
            <p className="text-[15px] text-[#0a1628]/55">
              Confirmation sent to{" "}
              <span className="font-semibold text-[#0a1628]">
                {customer?.email}
              </span>
            </p>
          </div>
        ) : (
          <div className="text-center  space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8 text-amber-500" strokeWidth={1.8} />
              </div>
            </div>
            <h1 className="text-[26px] font-extrabold text-[#0a1628] tracking-tight">
              Payment received
            </h1>
            <p className="text-[14px] text-[#0a1628]/55 max-w-xs mx-auto">
              We&apos;re confirming your contract — you&apos;ll receive an email
              shortly.
            </p>
          </div>
        )}

        {/* ── Reference ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#d4e8d9] bg-[#f0f8f3] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7c9885]">
              Contract reference
            </p>
            <p className="text-[18px] font-extrabold font-mono text-[#0a1628] mt-0.5">
              #{ref}
            </p>
          </div>
          {isConfirmed && (
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#7c9885] text-white uppercase tracking-wide">
              Active
            </span>
          )}
          {isPending && (
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">
              Processing
            </span>
          )}
        </div>

        {/* ── Contract details ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
              Contract details
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-5 py-3.5 flex items-start gap-3">
              <CheckCircle
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Service</p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {booking.plan_label ?? "Office Cleaning"}
                </p>
                {booking.office_name && (
                  <p className="text-[12px] text-[#0a1628]/50 mt-0.5">
                    {booking.office_name}
                  </p>
                )}
                {booking.weekly_hours && (
                  <p className="text-[12px] text-[#0a1628]/50">
                    {booking.weekly_hours}h/week · recurring
                  </p>
                )}
              </div>
            </div>

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
                  {booking.time_slot?.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 flex items-start gap-3">
              <Clock
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  Monthly charge
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

        {/* ── Next steps ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 space-y-3">
          <p className="text-[12px] xs font-bold uppercase tracking-widest text-gray-400">
            What happens next
          </p>
          {[
            "You'll receive a contract confirmation email with all details.",
            "Our team will contact you within 1 business day to confirm access and schedule.",
            "Your first clean will take place on the date shown above.",
            "Monthly billing starts after the first visit.",
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
            href={`/${locale}/pricing/office-cleaning`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#7c9885] text-[14px] font-semibold text-white hover:bg-[#6f8c78] transition-colors"
          >
            View pricing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Create account CTA ──────────────────────────────────────────── */}
        <MagicLinkCTA bookingEmail={customer?.email} locale={locale} />

        {/* ── Support ─────────────────────────────────────────────────────── */}
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
