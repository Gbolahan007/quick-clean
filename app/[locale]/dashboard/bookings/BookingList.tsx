"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  RefreshCw,
  Package,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  status: string;
  payment_status: string;
  frequency: string;
  booking_date: string;
  time_slot: string;
  final_price: number;
  plan_label: string | null;
  apartment_size: string | null;
  service_type: string;
  office_name: string | null;
  weekly_hours: number | null;
  current_period_end: string | null;
  current_period_start: string | null;
  cancel_at_period_end: boolean;
  subscription_status: string | null;
  visits_per_month: number | null;
  addons_snapshot: {
    count: number;
    names: string[];
    discount: number;
    rawTotal: number;
    discountedTotal: number;
  } | null;
  special_notes: string | null;
  stripe_subscription_id: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDateLong(dateStr: string): string {
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

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    confirmed: "bg-[#f0f8f3] text-[#3d6b47]",
    pending: "bg-amber-50 text-amber-700",
    completed: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-50 text-red-600",
  };
  return styles[status] ?? "bg-gray-100 text-gray-500";
}

function paymentBadge(status: string) {
  const styles: Record<string, string> = {
    paid: "bg-[#f0f8f3] text-[#3d6b47]",
    pending: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-600",
    refunded: "bg-gray-100 text-gray-500",
  };
  return styles[status] ?? "bg-gray-100 text-gray-500";
}

function frequencyLabel(frequency: string): string {
  const map: Record<string, string> = {
    "one-time": "One-time visit",
    weekly: "Weekly · 4 visits/month",
    biweekly: "Bi-weekly · 2 visits/month",
    monthly: "Monthly · 1 visit/month",
  };
  return map[frequency] ?? frequency;
}

function parseNotes(raw: string | null): {
  instructions: string | null;
  hasPets: boolean;
  petDetails: string | null;
} {
  try {
    return JSON.parse(raw ?? "{}");
  } catch {
    return { instructions: null, hasPets: false, petDetails: null };
  }
}

// ── Booking Modal ─────────────────────────────────────────────────────────────

function BookingModal({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const notes = parseNotes(booking.special_notes);
  const isOffice = booking.service_type === "office";
  const isRecurring = booking.frequency !== "one-time";
  const ref = booking.id.slice(0, 8).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Booking #{ref}
            </p>
            <h2 className="text-[17px] font-extrabold text-[#0a1628] mt-0.5">
              {booking.plan_label ??
                (isOffice ? "Office Cleaning" : "Cleaning")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0 ml-3"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Status row */}
          <div className="flex gap-2 flex-wrap">
            <span
              className={[
                "text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide",
                statusBadge(booking.status),
              ].join(" ")}
            >
              {booking.status}
            </span>
            <span
              className={[
                "text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide",
                paymentBadge(booking.payment_status),
              ].join(" ")}
            >
              {booking.payment_status}
            </span>
            {booking.subscription_status && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide bg-blue-50 text-blue-600">
                {booking.subscription_status}
              </span>
            )}
          </div>

          {/* Date & time */}
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="flex items-start gap-3 px-4 py-3">
              <Calendar
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  First visit
                </p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {formatDateLong(booking.booking_date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <Clock
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Time</p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {booking.time_slot?.slice(0, 5)}
                </p>
              </div>
            </div>
          </div>

          {/* Service details */}
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="flex items-start gap-3 px-4 py-3">
              <MapPin
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  Property
                </p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {isOffice
                    ? `${booking.office_name ?? "Office"} · ${booking.weekly_hours}h/week`
                    : (booking.apartment_size ?? "—")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <RefreshCw
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  Frequency
                </p>
                <p className="text-[14px] font-semibold text-[#0a1628]">
                  {frequencyLabel(booking.frequency)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <CreditCard
                className="w-4 h-4 text-[#7c9885] mt-0.5 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  {isRecurring ? "Monthly charge" : "Total"}
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

          {/* Addons */}
          {(booking.addons_snapshot?.count ?? 0) > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-[#7c9885]" strokeWidth={1.8} />
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                  Add-ons ({booking.addons_snapshot!.count})
                </p>
              </div>
              <div className="space-y-1">
                {booking.addons_snapshot!.names.map((name: string) => (
                  <p
                    key={name}
                    className="text-[13px] text-[#0a1628] flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c9885] shrink-0" />
                    {name}
                  </p>
                ))}
              </div>
              {booking.addons_snapshot!.discount > 0 && (
                <p className="text-[11px] text-[#7c9885] font-semibold mt-2">
                  {(booking.addons_snapshot!.discount * 100).toFixed(0)}% bundle
                  discount applied
                </p>
              )}
            </div>
          )}

          {/* Subscription billing period */}
          {isRecurring &&
            booking.current_period_start &&
            booking.current_period_end && (
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 space-y-1.5">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                  Current billing period
                </p>
                <p className="text-[13px] text-[#0a1628] font-semibold">
                  {formatDate(booking.current_period_start)} →{" "}
                  {formatDate(booking.current_period_end)}
                </p>
                {booking.cancel_at_period_end && (
                  <p className="text-[12px] text-amber-600 font-semibold">
                    ⚠ Cancels at end of period —{" "}
                    {formatDate(booking.current_period_end)}
                  </p>
                )}
                {booking.visits_per_month && (
                  <p className="text-[12px] text-gray-500">
                    {booking.visits_per_month} visit
                    {booking.visits_per_month !== 1 ? "s" : ""} this period
                  </p>
                )}
              </div>
            )}

          {/* Special instructions */}
          {(notes.instructions || notes.hasPets) && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 space-y-2">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                Notes
              </p>
              {notes.instructions && (
                <p className="text-[13px] text-[#0a1628] leading-relaxed">
                  {notes.instructions}
                </p>
              )}
              {notes.hasPets && (
                <p className="text-[12px] text-amber-700 font-semibold bg-amber-50 rounded-lg px-3 py-1.5">
                  🐾 Pets present
                  {notes.petDetails ? ` — ${notes.petDetails}` : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <p className="text-[11px] text-center text-gray-400">
            Questions about this booking?{" "}
            <a
              href="mailto:hello@frosh.fi"
              className="text-[#7c9885] font-medium hover:underline"
            >
              hello@frosh.fi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Booking Card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  muted = false,
  onClick,
}: {
  booking: Booking;
  locale: string;
  muted?: boolean;
  onClick: () => void;
}) {
  const isOffice = booking.service_type === "office";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border bg-white px-5 cursor-pointer py-4 transition-all duration-150",
        "hover:shadow-md hover:border-gray-300 active:scale-[0.99]",
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
              Cancels on {formatDate(booking.current_period_end!)}
            </p>
          )}
          {(booking.addons_snapshot?.count ?? 0) > 0 && (
            <p className="text-[11px] text-gray-400">
              + {booking.addons_snapshot!.count} add-on
              {booking.addons_snapshot!.count !== 1 ? "s" : ""}
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
          <p className="text-[11px] text-gray-400">Tap to view →</p>
        </div>
      </div>
    </button>
  );
}

// ── Booking List (exported) ───────────────────────────────────────────────────

export function BookingList({
  upcoming,
  past,
  locale,
}: {
  upcoming: Booking[];
  past: Booking[];
  locale: string;
}) {
  const [selected, setSelected] = useState<Booking | null>(null);

  return (
    <>
      {/* Upcoming */}
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
          upcoming.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              locale={locale}
              onClick={() => setSelected(b)}
            />
          ))
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-400">
            History
          </h2>
          {past.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              locale={locale}
              muted
              onClick={() => setSelected(b)}
            />
          ))}
        </section>
      )}

      {/* Modal */}
      {selected && (
        <BookingModal booking={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
