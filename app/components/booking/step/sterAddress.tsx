"use client";

import { useBookingStore } from "@/app/store/useBookingStore";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { AddressInfo } from "../../../types/booking";
import { Input, StepActions, Textarea } from "../FormField";

export function StepAddress() {
  const t = useTranslations("booking.address");

  const address = useBookingStore((s) => s.address);
  const saveAddress = useBookingStore((s) => s.saveAddress);
  const prevStep = useBookingStore((s) => s.prevStep);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInfo>({
    defaultValues: {
      street: address.street ?? "",
      apartment: address.apartment ?? "",
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",
      accessInstructions: address.accessInstructions ?? "",
    },
  });

  const onSubmit = (data: AddressInfo) => saveAddress(data);

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
          label={t("street")}
          placeholder="Mannerheimintie 12"
          required
          error={errors.street?.message}
          {...register("street", { required: t("errors.required") })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("apartment")}
            placeholder="A 14"
            hint={t("apartmentHint")}
            error={errors.apartment?.message}
            {...register("apartment")}
          />

          <Input
            label={t("postalCode")}
            placeholder="00100"
            required
            error={errors.postalCode?.message}
            {...register("postalCode", {
              required: t("errors.required"),
              pattern: {
                value: /^\d{5}$/,
                message: t("errors.invalidPostalCode"),
              },
            })}
          />
        </div>

        <Input
          label={t("city")}
          placeholder="Helsinki"
          required
          error={errors.city?.message}
          {...register("city", { required: t("errors.required") })}
        />

        <Textarea
          label={t("accessInstructions")}
          placeholder={t("accessPlaceholder")}
          hint={t("accessHint")}
          error={errors.accessInstructions?.message}
          {...register("accessInstructions")}
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
