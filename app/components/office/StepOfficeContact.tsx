// app/components/office/StepOfficeContact.tsx
// Identical UI to StepContact but reads/writes useOfficeBookingStore,
// not useBookingStore — so office booking state stays isolated.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";
import { contactSchema, type ContactSchema } from "@/app/schema/booking";
import { Input, StepActions } from "../booking/FormField";

export function StepOfficeContact() {
  const t = useTranslations("booking.contact");
  const contact = useOfficeBookingStore((s) => s.contact);
  const saveContact = useOfficeBookingStore((s) => s.saveContact);
  const prevStep = useOfficeBookingStore((s) => s.prevStep);

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
