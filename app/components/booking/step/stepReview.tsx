"use client";

import { useTranslations } from "next-intl";
import React from "react";

import { useBookingStore } from "@/app/store/useBookingStore";
import { StepActions } from "../FormField";

export function StepReview() {
  const t = useTranslations("booking.review");
  const tCommon = useTranslations("booking");

  const pricing = useBookingStore((s) => s.pricing);
  const contact = useBookingStore((s) => s.contact);
  const address = useBookingStore((s) => s.address);
  const schedule = useBookingStore((s) => s.schedule);
  const notes = useBookingStore((s) => s.notes);
  const prevStep = useBookingStore((s) => s.prevStep);
  const goToStep = useBookingStore((s) => s.goToStep);
  const submitBooking = useBookingStore((s) => s.submitBooking);
  const isSubmitting = useBookingStore((s) => s.isSubmitting);
  const submissionError = useBookingStore((s) => s.submissionError);

  if (!pricing) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
          {t("title")}
        </h2>
        <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
      </div>

      {/* ── Service summary ─────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.service")}
        onEdit={() => goToStep("contact")}
      >
        <ReviewRow
          label={t("fields.apartment")}
          value={`${pricing.apartment.emoji} ${pricing.apartment.labelKey} (${pricing.apartment.size})`}
        />
        <ReviewRow
          label={t("fields.serviceType")}
          value={pricing.serviceType}
        />
        <ReviewRow label={t("fields.plan")} value={pricing.planLabel} />
        <ReviewRow
          label={t("fields.totalPrice")}
          value={`€${pricing.totalPrice}`}
          valueClass="font-bold text-[#0a1628]"
        />
      </ReviewSection>

      {/* ── Contact ─────────────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.contact")}
        onEdit={() => goToStep("contact")}
      >
        <ReviewRow
          label={t("fields.name")}
          value={`${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()}
        />
        <ReviewRow label={t("fields.email")} value={contact.email ?? "—"} />
        <ReviewRow label={t("fields.phone")} value={contact.phone ?? "—"} />
        {contact.company && (
          <ReviewRow label={t("fields.company")} value={contact.company} />
        )}
      </ReviewSection>

      {/* ── Address ─────────────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.address")}
        onEdit={() => goToStep("address")}
      >
        <ReviewRow
          label={t("fields.address")}
          value={[
            address.street,
            address.apartment,
            address.postalCode,
            address.city,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        {address.accessInstructions && (
          <ReviewRow
            label={t("fields.access")}
            value={address.accessInstructions}
          />
        )}
      </ReviewSection>

      {/* ── Schedule ────────────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.schedule")}
        onEdit={() => goToStep("schedule")}
      >
        <ReviewRow
          label={t("fields.date")}
          value={schedule.preferredDate ?? "—"}
        />
        <ReviewRow
          label={t("fields.time")}
          value={schedule.preferredTime ?? "—"}
        />
        {schedule.alternateDate && (
          <ReviewRow
            label={t("fields.alternateDate")}
            value={schedule.alternateDate}
          />
        )}
      </ReviewSection>

      {/* ── Notes ───────────────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.notes")}
        onEdit={() => goToStep("notes")}
      >
        {notes.specialInstructions ? (
          <ReviewRow
            label={t("fields.instructions")}
            value={notes.specialInstructions}
          />
        ) : (
          <p className="text-[13px] text-gray-400 italic">{t("noNotes")}</p>
        )}
        <ReviewRow
          label={t("fields.pets")}
          value={
            notes.hasPets
              ? `✓ ${notes.petDetails ?? t("hasPets")}`
              : t("noPets")
          }
        />
      </ReviewSection>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {submissionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <span className="text-lg shrink-0">⚠️</span>
          <p className="text-[13px] text-red-700 m-0">{submissionError}</p>
        </div>
      )}

      {/* ── Legal note ──────────────────────────────────────────────────────── */}
      <p className="text-[11px] text-gray-400 leading-relaxed">
        {t("legalNote")}
      </p>

      <StepActions
        onNext={submitBooking}
        onBack={prevStep}
        nextLabel={t("confirm")}
        backLabel={tCommon("back")}
        isLoading={isSubmitting}
      />
    </div>
  );
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 m-0">
          {title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className={[
            "text-[12px] font-semibold text-[#7c9885]",
            "hover:text-[#3d6b47] transition-colors",
            "focus-visible:outline-none focus-visible:underline",
          ].join(" ")}
        >
          Edit
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  valueClass = "text-[#0a1628]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-[12px] text-gray-400 shrink-0 pt-px">{label}</span>
      <span className={`text-[13px] font-medium text-right ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
