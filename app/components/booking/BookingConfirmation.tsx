"use client";

import { useBookingStore } from "@/app/store/useBookingStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function BookingConfirmation() {
  const t = useTranslations("booking.confirmation");
  const router = useRouter();

  const { confirmedBookingId, resetBooking, pricing, contact, schedule } =
    useBookingStore((s) => ({
      confirmedBookingId: s.confirmedBookingId,
      resetBooking: s.resetBooking,
      pricing: s.pricing,
      contact: s.contact,
      schedule: s.schedule,
    }));

  const handleNewBooking = () => {
    resetBooking();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#f7faf8]">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div
            className={[
              "w-20 h-20 rounded-full bg-[#3d6b47] flex items-center justify-center",
              "shadow-[0_0_0_12px_rgba(124,152,133,0.15)]",
            ].join(" ")}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("subtitle", { email: contact.email ?? "" })}
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-[#0a1628] px-5 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 m-0">
              {t("bookingRef")}
            </p>
            <p className="text-white font-mono font-bold text-lg tracking-wider m-0">
              #{confirmedBookingId?.toUpperCase().slice(0, 8) ?? "CONFIRMED"}
            </p>
          </div>

          <div className="px-5 py-4 space-y-3">
            {pricing && (
              <>
                <ConfRow
                  label={t("fields.service")}
                  value={`${pricing.apartment.emoji} ${pricing.planLabel}`}
                />
                <ConfRow
                  label={t("fields.date")}
                  value={schedule.preferredDate ?? "—"}
                />
                <ConfRow
                  label={t("fields.time")}
                  value={schedule.preferredTime ?? "—"}
                />
                <div className="border-t border-gray-100 pt-3">
                  <ConfRow
                    label={t("fields.total")}
                    value={`€${pricing.totalPrice}`}
                    valueClass="font-extrabold text-lg text-[#0a1628]"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* What's next */}
        <div className="bg-[#f0f8f3] rounded-2xl p-5 border border-[#c8dcd0] mb-6">
          <p className="text-[12px] font-bold uppercase tracking-widest text-[#7c9885] mb-3">
            {t("nextSteps.title")}
          </p>
          <ol className="space-y-2">
            {(t.raw("nextSteps.items") as string[]).map(
              (item: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#7c9885] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-px">
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-[#3d6b47]">{item}</span>
                </li>
              ),
            )}
          </ol>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleNewBooking}
            className={[
              "w-full py-3.5 rounded-xl text-sm font-bold text-white",
              "bg-[#7c9885] hover:bg-[#6a8873]",
              "shadow-[0_2px_8px_rgba(124,152,133,0.4)]",
              "transition-all duration-150",
            ].join(" ")}
          >
            {t("bookAnother")}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className={[
              "w-full py-3 rounded-xl text-sm font-semibold text-[#0a1628]",
              "border border-gray-200 bg-white hover:bg-gray-50",
              "transition-all duration-150",
            ].join(" ")}
          >
            {t("goHome")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfRow({
  label,
  value,
  valueClass = "font-semibold text-[#0a1628]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-gray-400">{label}</span>
      <span className={`text-[13px] ${valueClass}`}>{value}</span>
    </div>
  );
}
