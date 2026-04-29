// components/booking/steps/StepNotes.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Special instructions and pet disclosure.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Textarea, CheckToggle, StepActions } from "../FormField";
import type { NotesInfo } from "../../../types/booking";
import { useBookingStore } from "@/app/store/useBookingStore";

export function StepNotes() {
  const t = useTranslations("booking.notes");
  const { notes, saveNotes, prevStep } = useBookingStore((s) => ({
    notes: s.notes,
    saveNotes: s.saveNotes,
    prevStep: s.prevStep,
  }));

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<NotesInfo>({
    defaultValues: {
      specialInstructions: notes.specialInstructions ?? "",
      hasPets: notes.hasPets ?? false,
      petDetails: notes.petDetails ?? "",
    },
  });

  const hasPets = watch("hasPets");
  const onSubmit = (data: NotesInfo) => saveNotes(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        <Textarea
          label={t("specialInstructions")}
          placeholder={t("instructionsPlaceholder")}
          hint={t("instructionsHint")}
          error={errors.specialInstructions?.message}
          {...register("specialInstructions")}
        />

        {/* Pet toggle */}
        <Controller
          name="hasPets"
          control={control}
          render={({ field }) => (
            <CheckToggle
              label={t("hasPets")}
              description={t("hasPetsDescription")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Conditional pet details */}
        {hasPets && (
          <div className="pl-4 border-l-2 border-[#7c9885]/30 animate-[fadeIn_0.2s_ease]">
            <Textarea
              label={t("petDetails")}
              placeholder={t("petDetailsPlaceholder")}
              hint={t("petDetailsHint")}
              error={errors.petDetails?.message}
              {...register("petDetails")}
            />
          </div>
        )}

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <span className="text-lg shrink-0">ℹ️</span>
          <p className="text-[12px] text-amber-700 m-0">{t("infoNote")}</p>
        </div>

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
