"use client";

import {
  officeScheduleSchema,
  type OfficeScheduleSchema,
} from "@/app/schema/officeBooking";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Input, StepActions } from "../booking/FormField";

const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function StepOfficeSchedule() {
  const t = useTranslations("officeBooking.schedule");
  const schedule = useOfficeBookingStore((s) => s.schedule);
  const saveSchedule = useOfficeBookingStore((s) => s.saveSchedule);
  const prevStep = useOfficeBookingStore((s) => s.prevStep);
  const recalcPricing = useOfficeBookingStore((s) => s.recalculatePricing);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OfficeScheduleSchema>({
    resolver: zodResolver(officeScheduleSchema),
    defaultValues: {
      weeklyHours: schedule.weeklyHours ?? 10,
      recurringRules: schedule.recurringRules ?? [],
      eveningWeekendSurcharge: schedule.eveningWeekendSurcharge ?? false,
      frequency: "weekly",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recurringRules",
  });

  const weeklyHours = watch("weeklyHours");
  const hasSurcharge = watch("eveningWeekendSurcharge");

  // Live pricing preview
  useEffect(() => {
    if (weeklyHours >= 2) {
      recalcPricing(weeklyHours, hasSurcharge);
    }
  }, [weeklyHours, hasSurcharge, recalcPricing]);

  const pricing = useOfficeBookingStore((s) => s.pricing);

  const toggleDay = (dayOfWeek: number) => {
    const existingIdx = fields.findIndex((f) => f.dayOfWeek === dayOfWeek);
    if (existingIdx >= 0) {
      remove(existingIdx);
    } else {
      append({ dayOfWeek, startTime: "08:00", durationHours: 2 });
    }
  };

  const onSubmit = (data: OfficeScheduleSchema) => saveSchedule(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* Weekly hours input */}
        <Input
          label={t("weeklyHours")}
          type="number"
          required
          hint={t("weeklyHoursHint")}
          error={errors.weeklyHours?.message}
          {...register("weeklyHours", {
            setValueAs: (v) => (v === "" ? 0 : parseFloat(v)),
          })}
        />

        {/* Live pricing preview */}
        {pricing && weeklyHours >= 2 && (
          <div className="rounded-xl border border-[#d4e8d9] bg-[#f0f8f3] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7c9885] mb-2">
              {t("pricingPreview")}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#0a1628]">
                €{pricing.finalMonthly.toFixed(0)}
              </span>
              <span className="text-[13px] text-gray-400">/ month</span>
            </div>
            <p className="text-[12px] text-[#3d6b47] mt-1">
              {pricing.tier.toUpperCase()} · €{pricing.hourlyRate}/h ·{" "}
              {pricing.weeklyHours}h/week
            </p>
          </div>
        )}

        {/* Recurring days */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[#0a1628]">
            {t("recurringDays")}
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((day) => {
              const isSelected = fields.some((f) => f.dayOfWeek === day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={[
                    "px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                    isSelected
                      ? "border-[#7c9885] bg-[#f0f8f3] text-[#3d6b47]"
                      : "border-gray-200 bg-white text-[#0a1628] hover:border-gray-300",
                  ].join(" ")}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          {errors.recurringRules && (
            <p role="alert" className="text-[12px] text-red-500">
              ⚠ {t("errors.atLeastOneDay")}
            </p>
          )}
        </div>

        {/* Per-day time and duration */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-[#0a1628]">
              {t("perDayTimes")}
            </p>
            {fields.map((field, idx) => {
              const dayLabel = DAY_OPTIONS.find(
                (d) => d.value === field.dayOfWeek,
              )?.label;
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50"
                >
                  <span className="text-[13px] font-bold text-[#7c9885] w-10 shrink-0">
                    {dayLabel}
                  </span>
                  <input
                    type="time"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-[#0a1628]"
                    {...register(`recurringRules.${idx}.startTime`)}
                  />
                  <input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    placeholder="2"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-[#0a1628] w-20"
                    {...register(`recurringRules.${idx}.durationHours`, {
                      setValueAs: (v) => (v === "" ? 0 : parseFloat(v)),
                    })}
                  />
                  <span className="text-[12px] text-gray-400">hrs</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Evening/weekend surcharge toggle */}
        <Controller
          name="eveningWeekendSurcharge"
          control={control}
          render={({ field }) => (
            <label
              className={[
                "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                field.value
                  ? "border-amber-300 bg-amber-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="sr-only"
              />
              <div
                className={[
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5",
                  field.value
                    ? "bg-amber-400 border-amber-400"
                    : "bg-white border-gray-300",
                ].join(" ")}
              >
                {field.value && (
                  <span className="text-white text-[10px] font-bold">✓</span>
                )}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0a1628]">
                  {t("eveningSurcharge")}
                </p>
                <p className="text-[12px] text-gray-400">
                  {t("eveningSurchargeDesc")}
                </p>
              </div>
            </label>
          )}
        />

        <input type="hidden" {...register("frequency")} value="weekly" />

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
