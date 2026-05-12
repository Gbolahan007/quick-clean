"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { useBookingStore } from "@/app/store/useBookingStore";
import { Input, StepActions } from "../FormField";
import { contactSchema, ContactSchema } from "@/app/schema/booking";

export function StepContact() {
  const t = useTranslations("booking.contact");

  const contact = useBookingStore((s) => s.contact);
  const saveContact = useBookingStore((s) => s.saveContact);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactSchema>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    },
  });

  const onSubmit = (data: ContactSchema) => saveContact(data);

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
            {...register("firstName")}
          />
          <Input
            label={t("lastName")}
            placeholder="Korhonen"
            required
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label={t("email")}
          type="email"
          placeholder="anna@example.com"
          required
          hint={t("emailHint")}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label={t("phone")}
          type="tel"
          placeholder="+358 40 123 4567"
          required
          hint={t("phoneHint")}
          error={errors.phone?.message}
          {...register("phone")}
        />

        {/* company removed — profiles table has no company column */}

        <StepActions
          onNext={() => handleSubmit(onSubmit)()}
          nextLabel={t("next")}
        />
      </div>
    </form>
  );
}
