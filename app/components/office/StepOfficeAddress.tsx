// app/components/office/StepOfficeAddress.tsx
// Same UI as StepAddress but reads/writes useOfficeBookingStore.
// squareMeters pre-fills from officeSizeSqm selected in StepOfficeDetails.
// numberOfRooms is estimated (officeSizeSqm / 25) — user can correct.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";
import { addressSchema, type AddressSchema } from "@/app/schema/booking";
import { Input, StepActions, Textarea } from "../booking/FormField";

export function StepOfficeAddress() {
  const t = useTranslations("booking.address");
  const address = useOfficeBookingStore((s) => s.address);
  const details = useOfficeBookingStore((s) => s.details);
  const saveAddress = useOfficeBookingStore((s) => s.saveAddress);
  const prevStep = useOfficeBookingStore((s) => s.prevStep);

  // Derive pre-fill values from office details
  const officeSize = details.officeSizeSqm ?? 75;
  const officeRooms = Math.ceil(officeSize / 25);

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
      squareMeters: address.squareMeters ?? officeSize,
      numberOfRooms: address.numberOfRooms ?? officeRooms,
      accessInstructions: address.accessInstructions ?? "",
    },
  });

  // Re-hydrate if office details change after mount
  useEffect(() => {
    reset({
      streetAddress: address.streetAddress ?? "",
      apartmentNumber: address.apartmentNumber ?? "",
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",
      squareMeters: address.squareMeters ?? officeSize,
      numberOfRooms: address.numberOfRooms ?? officeRooms,
      accessInstructions: address.accessInstructions ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.officeSizeSqm]);

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
          placeholder="Hämeenkatu 12"
          required
          error={errors.streetAddress?.message}
          {...register("streetAddress")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("apartment")}
            placeholder="3rd floor"
            hint={t("apartmentHint")}
            error={errors.apartmentNumber?.message}
            {...register("apartmentNumber")}
          />
          <Input
            label={t("postalCode")}
            placeholder="33100"
            required
            error={errors.postalCode?.message}
            {...register("postalCode")}
          />
        </div>

        <Input
          label={t("city")}
          placeholder="Tampere"
          required
          error={errors.city?.message}
          {...register("city")}
        />

        {/* Pre-filled from office size — user can correct */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("squareMeters")}
            type="number"
            placeholder={String(officeSize)}
            required
            hint={t("squareMetersHint")}
            error={errors.squareMeters?.message}
            {...register("squareMeters", {
              setValueAs: (v) => (v === "" ? undefined : parseInt(v, 10)),
            })}
          />
          <Input
            label={t("numberOfRooms")}
            type="number"
            placeholder={String(officeRooms)}
            required
            hint={t("numberOfRoomsHint")}
            error={errors.numberOfRooms?.message}
            {...register("numberOfRooms", {
              setValueAs: (v) => (v === "" ? undefined : parseInt(v, 10)),
            })}
          />
        </div>

        <Textarea
          label={t("accessInstructions")}
          placeholder="e.g. Building code 1234, ring reception on arrival"
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
