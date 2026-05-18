"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";
import {
  officeDetailsSchema,
  type OfficeDetailsSchema,
} from "@/app/schema/officeBooking";
import { Input, StepActions } from "../booking/FormField";

const WORKSPACE_TYPE_OPTIONS = [
  { value: "open_plan", labelKey: "openPlan" },
  { value: "private_offices", labelKey: "privateOffices" },
  { value: "coworking", labelKey: "coworking" },
  { value: "mixed", labelKey: "mixed" },
  { value: "warehouse", labelKey: "warehouse" },
] as const;

export function StepOfficeDetails() {
  const t = useTranslations("officeBooking.details");
  const details = useOfficeBookingStore((s) => s.details);
  const saveDetails = useOfficeBookingStore((s) => s.saveDetails);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OfficeDetailsSchema>({
    resolver: zodResolver(officeDetailsSchema),
    defaultValues: {
      officeName: details.officeName ?? "",
      workspaceType: details.workspaceType ?? undefined,
      officeSizeSqm: details.officeSizeSqm ?? undefined,
      staffCount: details.staffCount ?? undefined,
    },
  });

  const selectedType = watch("workspaceType");
  const onSubmit = (data: OfficeDetailsSchema) => saveDetails(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        <Input
          label={t("officeName")}
          placeholder="Acme Oy"
          required
          error={errors.officeName?.message}
          {...register("officeName")}
        />

        {/* Workspace type selector */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-[#0a1628]">
            {t("workspaceType")}
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {WORKSPACE_TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setValue("workspaceType", opt.value, {
                      shouldValidate: true,
                    })
                  }
                  className={[
                    "px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-all",
                    isSelected
                      ? "border-[#7c9885] bg-[#f0f8f3] text-[#3d6b47] shadow-[0_0_0_3px_rgba(124,152,133,0.15)]"
                      : "border-gray-200 bg-white text-[#0a1628] hover:border-gray-300",
                  ].join(" ")}
                >
                  {t(`workspaceTypes.${opt.labelKey}`)}
                </button>
              );
            })}
          </div>
          {errors.workspaceType && (
            <p role="alert" className="text-[12px] text-red-500">
              ⚠ {errors.workspaceType.message}
            </p>
          )}
          <input type="hidden" {...register("workspaceType")} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("officeSizeSqm")}
            type="number"
            placeholder="150"
            required
            hint={t("sizeSqmHint")}
            error={errors.officeSizeSqm?.message}
            {...register("officeSizeSqm", {
              setValueAs: (v) => (v === "" ? undefined : parseInt(v, 10)),
            })}
          />
          <Input
            label={t("staffCount")}
            type="number"
            placeholder="12"
            hint={t("staffCountHint")}
            error={errors.staffCount?.message}
            {...register("staffCount", {
              setValueAs: (v) => (v === "" ? 0 : parseInt(v, 10)),
            })}
          />
        </div>

        <StepActions
          onNext={() => handleSubmit(onSubmit)()}
          nextLabel={t("next")}
        />
      </div>
    </form>
  );
}
