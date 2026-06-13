// app/[locale]/pricing/office-cleaning/cancelled/page.tsx

import Link from "next/link";
import { ArrowLeft, RefreshCw, XCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ booking_id?: string }>;
}

export default async function OfficeBookingCancelledPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { booking_id } = await searchParams;

  const ref = booking_id ? booking_id.slice(0, 8).toUpperCase() : null;

  return (
    <main className="min-h-screen bg-[#f8faf9] flex items-start justify-center px-5 py-16">
      <div className="w-full max-w-lg space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-3 py-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-gray-400" strokeWidth={1.8} />
            </div>
          </div>
          <h1 className="text-[28px] font-extrabold text-[#0a1628] tracking-tight">
            Payment cancelled
          </h1>
          <p className="text-[15px] text-[#0a1628]/55 max-w-xs mx-auto">
            No charge was made. Your office contract request is saved — you can
            complete it any time.
          </p>
        </div>

        {/* ── Reference ──────────────────────────────────────────────────── */}
        {ref && (
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Contract reference
              </p>
              <p className="text-[18px] font-extrabold font-mono text-[#0a1628] mt-0.5">
                #{ref}
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
              Not paid
            </span>
          </div>
        )}

        {/* ── What happened ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 space-y-3">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            What happened
          </p>
          <p className="text-[13px] text-[#0a1628]/65 leading-relaxed">
            You left the payment page before completing checkout. This sometimes
            happens accidentally — your contract details are still held.
          </p>
          <p className="text-[13px] text-[#0a1628]/65 leading-relaxed">
            Click <strong>Try again</strong> to go back through the booking
            flow. Your details from the previous steps are still saved.
          </p>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/pricing/office-cleaning`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 text-[14px] font-semibold text-[#0a1628] hover:border-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to pricing
          </Link>
          <Link
            href={`/${locale}/pricing/office-cleaning-booking`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#7c9885] text-[14px] font-semibold text-white hover:bg-[#6f8c78] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Link>
        </div>

        {/* ── Support ────────────────────────────────────────────────────── */}
        <p className="text-center text-[12px] text-gray-400">
          Having trouble?{" "}
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
