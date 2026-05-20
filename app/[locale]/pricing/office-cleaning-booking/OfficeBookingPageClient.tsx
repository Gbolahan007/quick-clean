"use client";

import { StepOfficeAddons } from "@/app/components/office/StepOfficeAddons";
import { StepOfficeAddress } from "@/app/components/office/StepOfficeAddress";
import { StepOfficeContact } from "@/app/components/office/StepOfficeContact";
import { StepOfficeDetails } from "@/app/components/office/StepOfficeDetails";
import { StepOfficeReview } from "@/app/components/office/StepOfficeReview";
import { StepOfficeSchedule } from "@/app/components/office/StepOfficeSchedule";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";
import {
  OFFICE_BOOKING_STEPS,
  type OfficeBookingStep,
} from "@/app/types/office";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

type Props = { localeProp: "en" | "fi" };

// ── Step labels from translations ─────────────────────────────────────────────

// function useStepLabel(step: OfficeBookingStep): string {
//   const t = useTranslations("officeBooking.steps");
//   return t(step);
// }

// ── Step progress indicator ───────────────────────────────────────────────────

function StepProgress({ currentStep }: { currentStep: OfficeBookingStep }) {
  const t = useTranslations("officeBooking.steps");
  const currentIdx = OFFICE_BOOKING_STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 ">
      {OFFICE_BOOKING_STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                  isDone
                    ? "bg-[#7c9885] text-white"
                    : isCurrent
                      ? "bg-[#0a1628] text-white ring-4 ring-[#0a1628]/10"
                      : "bg-gray-100 text-gray-400",
                ].join(" ")}
              >
                {isDone ? "✓" : idx + 1}
              </div>
              <span
                className={[
                  "text-[10px] font-semibold mt-1 whitespace-nowrap",
                  isCurrent
                    ? "text-[#0a1628]"
                    : isDone
                      ? "text-[#7c9885]"
                      : "text-gray-400",
                ].join(" ")}
              >
                {t(step)}
              </span>
            </div>

            {idx < OFFICE_BOOKING_STEPS.length - 1 && (
              <div
                className={[
                  "h-0.5 w-8 mx-1 mb-4 rounded-full transition-colors",
                  idx < currentIdx ? "bg-[#7c9885]" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sidebar pricing summary ───────────────────────────────────────────────────

function PricingSidebar() {
  const pricing = useOfficeBookingStore((s) => s.pricing);
  const details = useOfficeBookingStore((s) => s.details);
  const addons = useOfficeBookingStore((s) => s.addons);

  if (!pricing) return null;

  const total = Math.round(
    pricing.finalMonthly + (addons.addonsMonthlyTotal ?? 0),
  );

  return (
    <div className="rounded-2xl border border-[#d4e8d9] bg-[#f0f8f3] p-5 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#7c9885]">
        Contract summary
      </p>

      {details.officeName && (
        <p className="text-[13px] font-semibold text-[#0a1628]">
          {details.officeName}
        </p>
      )}

      <div className="space-y-1.5">
        <SidebarRow
          label="Weekly hours"
          value={`${pricing.weeklyHours}h/week`}
        />
        <SidebarRow
          label="Rate"
          value={`€${pricing.hourlyRate}/h (${pricing.tier.toUpperCase()})`}
        />
        <SidebarRow
          label="Weekly cost"
          value={`€${Math.round(pricing.weeklyCost)}`}
        />
        {pricing.hasSurcharge && (
          <SidebarRow
            label="Surcharge (+15%)"
            value={`+€${Math.round(pricing.surchargeAmount)}`}
            amber
          />
        )}
        {addons.addonsMonthlyTotal > 0 && (
          <SidebarRow
            label="Add-ons"
            value={`+€${addons.addonsMonthlyTotal}`}
          />
        )}
      </div>

      <div className="border-t border-[#c8dcd0] pt-2.5 flex justify-between items-center">
        <span className="text-[13px] font-bold text-[#0a1628]">
          Monthly estimate
        </span>
        <span className="text-[18px] font-extrabold text-[#3d6b47]">
          €{total}
        </span>
      </div>

      <p className="text-[10px] text-[#7c9885]/70 leading-relaxed">
        incl. VAT 25.5% · Final pricing confirmed before contract start
      </p>
    </div>
  );
}

function SidebarRow({
  label,
  value,
  amber = false,
}: {
  label: string;
  value: string;
  amber?: boolean;
}) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className={amber ? "text-amber-600" : "text-[#0a1628]/60"}>
        {label}
      </span>
      <span
        className={`font-semibold ${amber ? "text-amber-600" : "text-[#0a1628]"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Confirmation screen ───────────────────────────────────────────────────────

function ConfirmationScreen() {
  const t = useTranslations("officeBooking.confirmation");
  const params = useParams();
  const locale = params.locale as string;
  const bookingId = useOfficeBookingStore((s) => s.confirmedBookingId);
  const details = useOfficeBookingStore((s) => s.details);
  const reset = useOfficeBookingStore((s) => s.resetOfficeBooking);
  const nextSteps = t.raw("nextSteps.items") as string[];

  return (
    <div className="text-center py-12 space-y-6">
      <div className="text-5xl" aria-hidden>
        🎉
      </div>
      <div>
        <h2 className="text-[26px] font-extrabold text-[#0a1628] tracking-tight">
          {t("title")}
        </h2>
        <p className="text-[14px] text-gray-500 mt-2">
          {t("subtitle")}
          {details.officeName && ` ${details.officeName}!`}
        </p>
      </div>

      {bookingId && (
        <div className="inline-block px-5 py-3 rounded-xl bg-[#f0f8f3] border border-[#d4e8d9]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#7c9885] mb-1">
            {t("bookingRef")}
          </p>
          <p className="text-[14px] font-mono font-bold text-[#0a1628]">
            {bookingId.slice(0, 8).toUpperCase()}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-left max-w-md mx-auto space-y-2">
        <p className="text-[12px] font-bold text-[#0a1628] mb-3">
          {t("nextSteps.title")}
        </p>
        {nextSteps.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span
              className="text-[#7c9885] shrink-0 mt-0.5 text-[11px]"
              aria-hidden
            >
              ✓
            </span>
            <span className="text-[12px] text-[#0a1628]/70">{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center ">
        <Link
          href={`/${locale}`}
          className="px-6 py-3 rounded-xl border border-gray-200 text-[14px] font-semibold text-[#0a1628] hover:border-gray-300 transition-colors"
        >
          {t("goHome")}
        </Link>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-[#7c9885] text-[14px] font-semibold text-white hover:bg-[#6f8c78] transition-colors cursor-pointer"
        >
          {t("bookAnother")}
        </button>
      </div>
    </div>
  );
}

// ── Main page client ──────────────────────────────────────────────────────────

export function OfficeBookingPageClient({ localeProp }: Props) {
  const t = useTranslations("officeBooking");
  const params = useParams();
  const locale = (params.locale as string) ?? localeProp;
  const currentStep = useOfficeBookingStore((s) => s.currentStep);
  const confirmedId = useOfficeBookingStore((s) => s.confirmedBookingId);

  if (confirmedId) {
    return (
      <div className="min-h-screen bg-[#f8faf9]">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <ConfirmationScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  bg-[#f8faf9] ">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-5 py-4 pt-28">
        <div className="mx-auto max-w-5xl flex items-center gap-4">
          <Link
            href={`/${locale}/pricing/office-cleaning`}
            className="text-[13px] text-[#7c9885] font-semibold hover:underline"
          >
            ← {t("backToPricing")}
          </Link>
          <span className="text-gray-300" aria-hidden>
            |
          </span>
          <span className="text-[13px] font-bold text-[#0a1628]">
            {t("pageTitle")}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
          {/* ── Left: form steps ──────────────────────────────────────────── */}
          <div>
            <StepProgress currentStep={currentStep} />

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_2px_8px_rgba(10,22,40,0.04)]">
              {currentStep === "details" && <StepOfficeDetails />}
              {currentStep === "schedule" && <StepOfficeSchedule />}
              {currentStep === "addons" && <StepOfficeAddons />}
              {currentStep === "contact" && <StepOfficeContact />}
              {currentStep === "address" && <StepOfficeAddress />}
              {currentStep === "review" && <StepOfficeReview />}
            </div>
          </div>

          {/* ── Right: sticky pricing sidebar ─────────────────────────────── */}
          <div className="lg:sticky lg:top-6">
            <PricingSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
