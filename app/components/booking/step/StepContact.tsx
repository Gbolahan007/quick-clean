"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useBookingStore } from "@/app/store/useBookingStore";
import type { ContactInfo } from "../../../types/booking";
import { Input, StepActions } from "../FormField";

export function StepContact() {
  const t = useTranslations("booking.contact");

  const contact = useBookingStore((s) => s.contact);
  const saveContact = useBookingStore((s) => s.saveContact);
  //   const prevStep = useBookingStore((s) => s.prevStep);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactInfo>({
    defaultValues: {
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      company: contact.company ?? "",
    },
  });

  const onSubmit = (data: ContactInfo) => saveContact(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("firstName")}
            placeholder="Anna"
            required
            error={errors.firstName?.message}
            {...register("firstName", {
              required: t("errors.required"),
              minLength: { value: 2, message: t("errors.minLength", { n: 2 }) },
            })}
          />
          <Input
            label={t("lastName")}
            placeholder="Korhonen"
            required
            error={errors.lastName?.message}
            {...register("lastName", {
              required: t("errors.required"),
            })}
          />
        </div>

        <Input
          label={t("email")}
          type="email"
          placeholder="anna@example.com"
          required
          hint={t("emailHint")}
          error={errors.email?.message}
          {...register("email", {
            required: t("errors.required"),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t("errors.invalidEmail"),
            },
          })}
        />

        <Input
          label={t("phone")}
          type="tel"
          placeholder="+358 40 123 4567"
          required
          hint={t("phoneHint")}
          error={errors.phone?.message}
          {...register("phone", {
            required: t("errors.required"),
            minLength: { value: 7, message: t("errors.invalidPhone") },
          })}
        />

        <Input
          label={t("company")}
          placeholder={t("companyPlaceholder")}
          hint={t("companyHint")}
          error={errors.company?.message}
          {...register("company")}
        />

        <StepActions
          onNext={() => handleSubmit(onSubmit)()}
          nextLabel={t("next")}
        />
      </div>
    </form>
  );
}
