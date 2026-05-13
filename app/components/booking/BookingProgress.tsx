"use client";

import {
  useBookingStore,
  useStepCompletion,
} from "@/app/store/useBookingStore";
import { useTranslations } from "next-intl";
import React from "react";
import { BOOKING_STEPS, type BookingStep } from "../../types/booking";

const STEP_ICONS: Record<BookingStep, string> = {
  contact: "👤",
  address: "📍",
  schedule: "📅",
  notes: "📝",
  review: "✅",
};

export function BookingProgress() {
  const t = useTranslations("booking");
  const currentStep = useBookingStore((s) => s.currentStep);
  const goToStep = useBookingStore((s) => s.goToStep);
  const completion = useStepCompletion();

  const currentIdx = BOOKING_STEPS.indexOf(currentStep);

  return (
    <nav aria-label="Booking progress" className="w-full">
      <ol className="flex items-center w-full">
        {BOOKING_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx || completion[step];
          const isCurrent = step === currentStep;
          const isPast = idx < currentIdx;
          const isClickable =
            isPast || (idx > 0 && completion[BOOKING_STEPS[idx - 1]]);

          return (
            <React.Fragment key={step}>
              <li className="flex flex-col items-center shrink-0">
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(step)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "text-sm font-bold transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    "focus-visible:ring-[#7c9885]",
                    isCurrent
                      ? "bg-[#7c9885] text-white shadow-[0_0_0_4px_rgba(124,152,133,0.2)]"
                      : isPast && isCompleted
                        ? "bg-[#3d6b47] text-white cursor-pointer hover:bg-[#2e5237]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed",
                  ].join(" ")}
                >
                  {isPast && isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span>{STEP_ICONS[step]}</span>
                  )}
                </button>

                <span
                  className={[
                    "mt-1.5 text-[11px] font-semibold tracking-wide text-center whitespace-nowrap hidden sm:block",
                    isCurrent
                      ? "text-[#3d6b47]"
                      : isPast
                        ? "text-[#7c9885]"
                        : "text-gray-400",
                  ].join(" ")}
                >
                  {t(`steps.${step}`)}
                </span>
              </li>

              {/* Connector line */}
              {idx < BOOKING_STEPS.length - 1 && (
                <div
                  className={[
                    "h-0.5 flex-1 mx-2 rounded-full transition-colors duration-300",
                    idx < currentIdx ? "bg-[#7c9885]" : "bg-gray-200",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
