"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useBookingStore } from "@/app/store/useBookingStore";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { scheduleSchema, type ScheduleSchema } from "@/app/schema/booking";
import { Input, StepActions } from "../FormField";
import { SlotOption } from "@/app/types/slot";
import {
  isoDateOffset,
  isWeekend,
} from "@/app/[locale]/pricing/data/lib/slotUtils";
import { fetchSlotsForDate } from "@/app/[locale]/pricing/data/lib/fetchSlots";

export function StepSchedule() {
  const t = useTranslations("booking.schedule");
  const schedule = useBookingStore((s) => s.schedule);
  const saveSchedule = useBookingStore((s) => s.saveSchedule);
  const prevStep = useBookingStore((s) => s.prevStep);

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScheduleSchema>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      bookingDate: schedule.bookingDate ?? "",
      timeSlot: schedule.timeSlot ?? "",
      slotId: schedule.slotId ?? "",
      slotEndTime: schedule.slotEndTime ?? "",
    },
  });

  const bookingDate = watch("bookingDate");
  const minDate = isoDateOffset(2);
  const maxDate = isoDateOffset(90);

  // ── Slot loader ─────────────────────────────────────────────────────────────
  const loadSlots = useCallback(
    async (date: string) => {
      if (!date) return;

      // Clear previous slot selection when date changes
      setValue("timeSlot", "");
      setValue("slotId", "");
      setValue("slotEndTime", "");

      if (isWeekend(date)) {
        setSlots([]);
        setSlotsError(t("errors.weekendNotAvailable"));
        return;
      }

      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);

      try {
        const result = await fetchSlotsForDate(date);
        console.log("[StepSchedule] slots fetched:", result);
        setSlots(result);
        if (result.length === 0) {
          setSlotsError(t("errors.noSlotsAvailable"));
        }
      } catch (err) {
        console.error("[StepSchedule] fetch error:", err);
        setSlotsError(
          err instanceof Error ? err.message : t("errors.slotsFetchFailed"),
        );
      } finally {
        setSlotsLoading(false);
      }
    },
    [setValue, t],
  );

  // ── Track previous date with a real ref ─────────────────────────────────────
  const prevDateRef = useRef<string>("");

  useEffect(() => {
    if (!bookingDate) return;

    // Run on mount (persisted date) OR when date actually changes
    if (bookingDate !== prevDateRef.current) {
      prevDateRef.current = bookingDate;
      loadSlots(bookingDate);
    }
  }, [bookingDate, loadSlots]);

  const onSubmit = (data: ScheduleSchema) => saveSchedule(data);

  const handleSlotSelect = (
    slot: SlotOption,
    onChange: (val: string) => void,
  ) => {
    if (!slot.isAvailable) return;
    onChange(slot.id);
    setValue("timeSlot", slot.startTime);
    setValue("slotEndTime", slot.endTime);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* Date picker */}
        <Input
          label={t("preferredDate")}
          type="date"
          required
          min={minDate}
          max={maxDate}
          hint={t("dateHint")}
          error={errors.bookingDate?.message}
          {...register("bookingDate")}
        />

        {/* Time slot picker */}
        <div className="flex flex-col gap-1.5 ">
          <p className="text-[13px] font-semibold text-[#0a1628]">
            {t("preferredTime")}
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          </p>
          <p className="text-[11px] text-gray-400 -mt-0.5">{t("timeHint")}</p>

          {/* Loading skeleton */}
          {slotsLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-13 rounded-xl border border-gray-100 bg-gray-50 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!slotsLoading && slotsError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[13px] text-amber-700">{slotsError}</p>
            </div>
          )}

          {/* Empty — date picked but no slots */}
          {!slotsLoading &&
            !slotsError &&
            bookingDate &&
            slots.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[13px] text-gray-400">
                  {t("noSlotsForDate")}
                </p>
              </div>
            )}

          {/* Prompt — no date yet */}
          {!slotsLoading && !bookingDate && (
            <p className="text-[12px] text-gray-400 italic">
              {t("selectDateFirst")}
            </p>
          )}

          {/* Slot buttons */}
          {!slotsLoading && slots.length > 0 && (
            <Controller
              name="slotId"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slots.map((slot) => {
                    const isSelected = field.value === slot.id;
                    const isDisabled = !slot.isAvailable;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleSlotSelect(slot, field.onChange)}
                        aria-pressed={isSelected}
                        aria-disabled={isDisabled}
                        className={[
                          "relative px-4 py-3 rounded-xl border text-sm font-semibold",
                          "transition-all duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885]/50",
                          isSelected
                            ? "border-[#7c9885] bg-[#f0f8f3] text-[#3d6b47] shadow-[0_0_0_3px_rgba(124,152,133,0.15)]"
                            : "",
                          !isSelected && !isDisabled
                            ? "border-gray-200 bg-white text-[#0a1628] hover:border-[#7c9885]/50 hover:bg-[#f9fdfb]"
                            : "",
                          isDisabled
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                            : "cursor-pointer",
                        ].join(" ")}
                      >
                        <span className="block">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        {isDisabled && (
                          <span className="block text-[10px] font-normal mt-0.5 text-gray-400 no-underline">
                            {t("slotFull")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          )}

          {errors.slotId && (
            <p
              role="alert"
              className="text-[12px] text-red-500 flex gap-1 items-center"
            >
              <span aria-hidden>⚠</span> {t("errors.required")}
            </p>
          )}
        </div>

        {/* Hidden fields */}
        <input type="hidden" {...register("timeSlot")} />
        <input type="hidden" {...register("slotEndTime")} />

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
