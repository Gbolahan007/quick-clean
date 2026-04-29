"use client";

import { useBookingStore } from "@/app/store/useBookingStore";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import type { ScheduleInfo } from "../../../types/booking";
import { Input, StepActions } from "../FormField";

/** Available time slots */
const TIME_SLOTS = [
  { value: "08:00", label: "08:00 – 10:00" },
  { value: "10:00", label: "10:00 – 12:00" },
  { value: "12:00", label: "12:00 – 14:00" },
  { value: "14:00", label: "14:00 – 16:00" },
  { value: "16:00", label: "16:00 – 18:00" },
];

/** Returns ISO date string for today + `daysAhead` days */
function isoDateOffset(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function StepSchedule() {
  const t = useTranslations("booking.schedule");
  const schedule = useBookingStore((s) => s.schedule);
  const saveSchedule = useBookingStore((s) => s.saveSchedule);
  const prevStep = useBookingStore((s) => s.prevStep);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ScheduleInfo>({
    defaultValues: {
      preferredDate: schedule.preferredDate ?? "",
      preferredTime: schedule.preferredTime ?? "",
      alternateDate: schedule.alternateDate ?? "",
    },
  });

  const onSubmit = (data: ScheduleInfo) => saveSchedule(data);

  // Earliest bookable date: 2 business days from now
  const minDate = isoDateOffset(2);
  // Max: 90 days out
  const maxDate = isoDateOffset(90);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* Preferred date */}
        <Input
          label={t("preferredDate")}
          type="date"
          required
          min={minDate}
          max={maxDate}
          hint={t("dateHint")}
          error={errors.preferredDate?.message}
          {...register("preferredDate", {
            required: t("errors.required"),
            min: { value: minDate, message: t("errors.dateTooSoon") },
          })}
        />

        {/* Time slot picker */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-[#0a1628]">
            {t("preferredTime")}
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          </p>
          <p className="text-[11px] text-gray-400 -mt-0.5">{t("timeHint")}</p>

          <Controller
            name="preferredTime"
            control={control}
            rules={{ required: t("errors.required") }}
            render={({ field }) => (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = field.value === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => field.onChange(slot.value)}
                      className={[
                        "px-4 py-3 rounded-xl border text-sm font-semibold",
                        "transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2",
                        "focus-visible:ring-[#7c9885]/50",
                        isSelected
                          ? "border-[#7c9885] bg-[#f0f8f3] text-[#3d6b47] shadow-[0_0_0_3px_rgba(124,152,133,0.15)]"
                          : "border-gray-200 bg-white text-[#0a1628] hover:border-gray-300",
                      ].join(" ")}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            )}
          />

          {errors.preferredTime && (
            <p
              role="alert"
              className="text-[12px] text-red-500 flex gap-1 items-center"
            >
              <span aria-hidden>⚠</span> {errors.preferredTime.message}
            </p>
          )}
        </div>

        {/* Alternate date */}
        <Input
          label={t("alternateDate")}
          type="date"
          min={minDate}
          max={maxDate}
          hint={t("alternateDateHint")}
          error={errors.alternateDate?.message}
          {...register("alternateDate")}
        />

        <StepActions
          onNext={() => handleSubmit(onSubmit)()}
          onBack={prevStep}
          nextLabel={t("next")}
          backLabel={t("back")}
        />
      </div>
    </form>
  );
}
