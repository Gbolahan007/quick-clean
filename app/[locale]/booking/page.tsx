"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookingStep } from "@/app/types/booking";
import { StepContact } from "@/app/components/booking/step/StepContact";
import { StepAddress } from "@/app/components/booking/step/sterAddress";
import { StepSchedule } from "@/app/components/booking/step/stepSchedule";
import { StepNotes } from "@/app/components/booking/step/stepNotes";
import { StepReview } from "@/app/components/booking/step/stepReview";
import { useBookingStore } from "@/app/store/useBookingStore";
import { BookingConfirmation } from "@/app/components/booking/BookingConfirmation";
import { BookingProgress } from "@/app/components/booking/BookingProgress";
import { BookingSidebar } from "@/app/components/booking/BookingSidebar";

const STEP_COMPONENTS: Record<BookingStep, React.ComponentType> = {
  contact: StepContact,
  address: StepAddress,
  schedule: StepSchedule,
  notes: StepNotes,
  review: StepReview,
};

interface BookingPageProps {
  params: Promise<{ locale: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations("booking");

  const pricing = useBookingStore((s) => s.pricing);
  const currentStep = useBookingStore((s) => s.currentStep);
  const confirmedBookingId = useBookingStore((s) => s.confirmedBookingId);

  useEffect(() => {
    if (!pricing && !confirmedBookingId) {
      router.replace(`/${locale}`);
    }
  }, [pricing, confirmedBookingId, router, locale]);

  if (!pricing && !confirmedBookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7faf8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#7c9885] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (confirmedBookingId) {
    return <BookingConfirmation />;
  }

  const ActiveStep = STEP_COMPONENTS[currentStep];

  return (
    <div className="min-h-screen bg-[#f7faf8] pt-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 ">
          <button
            type="button"
            onClick={() => router.back()}
            className={[
              "flex cursor-pointer items-center gap-2 text-sm text-gray-500",
              "hover:text-[#0a1628] transition-colors",
              "focus-visible:outline-none focus-visible:underline",
            ].join(" ")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t("backToPricing")}
          </button>

          <p className="text-[13px] font-semibold text-[#0a1628] hidden sm:block">
            {t("pageTitle")}
          </p>

          <p className="text-[12px] text-gray-400 sm:hidden">
            {t("stepOf", {
              current:
                ["contact", "address", "schedule", "notes", "review"].indexOf(
                  currentStep,
                ) + 1,
              total: 5,
            })}
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <BookingProgress />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div
            className={[
              "bg-white rounded-2xl border border-gray-200",
              "shadow-[0_2px_12px_rgba(10,22,40,0.04)]",
              "p-6 sm:p-8",
            ].join(" ")}
          >
            <ActiveStep />
          </div>

          <div className="hidden lg:block">
            <BookingSidebar />
          </div>
        </div>
      </main>

      <MobilePricingStrip />
    </div>
  );
}

function MobilePricingStrip() {
  const pricing = useBookingStore((s) => s.pricing);
  const t = useTranslations("booking");

  if (!pricing) return null;

  return (
    <div
      className={[
        "lg:hidden fixed w-full bottom-0 z-20",
        "bg-[#0a1628] border-t border-white/10",
        "px-5 py-3 flex items-center justify-between gap-4",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 m-0">
          {pricing.apartment.emoji} {pricing.planLabel}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-white/50 m-0">{t("total")}</p>
        <p className="text-lg font-extrabold text-white m-0 tracking-tight">
          €{pricing.totalPrice}
        </p>
      </div>
    </div>
  );
}
