"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useBookingStore } from "@/app/store/useBookingStore";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { addressSchema, type AddressSchema } from "@/app/schema/booking";
import { Input, StepActions, Textarea } from "../FormField";

export function StepAddress() {
  const t = useTranslations("booking.address");

  const pricing = useBookingStore((s) => s.pricing);
  const address = useBookingStore((s) => s.address);
  const saveAddress = useBookingStore((s) => s.saveAddress);
  const prevStep = useBookingStore((s) => s.prevStep);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressSchema>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      streetAddress: address.streetAddress ?? "",
      apartmentNumber: address.apartmentNumber ?? "",
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",
      squareMeters: address.squareMeters ?? pricing?.apartment.squareMeters,
      numberOfRooms: address.numberOfRooms ?? pricing?.apartment.numberOfRooms,
      accessInstructions: address.accessInstructions ?? "",
    },
  });

  useEffect(() => {
    if (!pricing) return;

    reset({
      streetAddress: address.streetAddress ?? "",
      apartmentNumber: address.apartmentNumber ?? "",
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",
      squareMeters: address.squareMeters ?? pricing.apartment.squareMeters,
      numberOfRooms: address.numberOfRooms ?? pricing.apartment.numberOfRooms,
      accessInstructions: address.accessInstructions ?? "",
    });
  }, [pricing?.apartment.key]);

  const onSubmit = (data: AddressSchema) => saveAddress(data);

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
          error={errors.streetAddress?.message}
          {...register("streetAddress")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ">
          <Input
            label={t("apartment")}
            placeholder="A 14"
            // hint={t("apartmentHint")}
            error={errors.apartmentNumber?.message}
            {...register("apartmentNumber")}
          />
          <Input
            label={t("postalCode")}
            placeholder="00100"
            required
            error={errors.postalCode?.message}
            {...register("postalCode")}
          />
        </div>

        <Input
          label={t("city")}
          placeholder="Helsinki"
          required
          error={errors.city?.message}
          {...register("city")}
        />

        {/* Pre-filled from apartment selection — read-only so the user
            can't accidentally change values that were set during pricing. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("squareMeters")}
            type="number"
            hint={t("squareMetersHint")}
            error={errors.squareMeters?.message}
            readOnly
            className="bg-gray-50 text-gray-500 cursor-not-allowed"
            {...register("squareMeters", { valueAsNumber: true })}
          />
          <Input
            label={t("numberOfRooms")}
            type="number"
            hint={t("numberOfRoomsHint")}
            error={errors.numberOfRooms?.message}
            readOnly
            className="bg-gray-50 text-gray-500 cursor-not-allowed"
            {...register("numberOfRooms", { valueAsNumber: true })}
          />
        </div>

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
