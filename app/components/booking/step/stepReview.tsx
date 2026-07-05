"use client";

import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { useBookingStore } from "@/app/store/useBookingStore";
import { StepActions } from "../FormField";
import { VoucherInput } from "@/app/components/booking/VoucherInput";
import type { VoucherPreview } from "@/app/lib/vouchers/types";

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

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

  const [appliedVoucher, setAppliedVoucher] = useState<VoucherPreview | null>(
    null,
  );

  if (!pricing) return null;

  // Original amount in cents (plan + addons, no discount)
  const originalAmountCents = Math.round(pricing.totalPrice * 100);

  // Discounted amount for display
  const discountAmountCents = appliedVoucher?.discountAmountCents ?? 0;
  const finalAmountCents = appliedVoucher
    ? appliedVoucher.finalAmountCents
    : originalAmountCents;

  const hasDiscount = discountAmountCents > 0;
  const isFree = finalAmountCents === 0;

  function handleSubmit() {
    submitBooking(appliedVoucher?.code ?? null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
          {t("title")}
        </h2>
        <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
      </div>

      {/* ── Service summary ──────────────────────────────────────────────── */}
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
      </ReviewSection>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
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
      </ReviewSection>

      {/* ── Address ──────────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.address")}
        onEdit={() => goToStep("address")}
      >
        <ReviewRow
          label={t("fields.address")}
          value={[
            address.streetAddress,
            address.apartmentNumber,
            address.postalCode,
            address.city,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        {address.squareMeters != null && (
          <ReviewRow
            label={t("fields.size")}
            value={`${address.squareMeters} m² · ${address.numberOfRooms ?? "—"} rooms`}
          />
        )}
        {address.accessInstructions && (
          <ReviewRow
            label={t("fields.access")}
            value={address.accessInstructions}
          />
        )}
      </ReviewSection>

      {/* ── Schedule ─────────────────────────────────────────────────────── */}
      <ReviewSection
        title={t("sections.schedule")}
        onEdit={() => goToStep("schedule")}
      >
        <ReviewRow
          label={t("fields.date")}
          value={schedule.bookingDate ?? "—"}
        />
        <ReviewRow label={t("fields.time")} value={schedule.timeSlot ?? "—"} />
      </ReviewSection>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
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

      {/* ── Price breakdown ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            {t("sections.service")}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500">
              {pricing.planLabel}
              {pricing.apartment.size ? ` · ${pricing.apartment.size}` : ""}
            </span>
            <span className="text-[13px] font-semibold text-[#0a1628]">
              {formatCents(originalAmountCents)}
            </span>
          </div>

          {/* Voucher line */}
          {hasDiscount && (
            <div className="flex items-center justify-between text-[#3d6b47]">
              <span className="text-[13px] font-medium">
                Voucher ({appliedVoucher!.code})
              </span>
              <span className="text-[13px] font-semibold">
                −{formatCents(discountAmountCents)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0a1628]">
                Total
              </span>
              <div className="text-right">
                {hasDiscount && (
                  <p className="text-[11px] text-gray-400 line-through">
                    {formatCents(originalAmountCents)}
                  </p>
                )}
                <p className="text-[18px] font-extrabold text-[#0a1628]">
                  {isFree ? "Free" : formatCents(finalAmountCents)}
                </p>
              </div>
            </div>
          </div>

          {/* VAT note */}
          <p className="text-[11px] text-gray-400">incl. VAT 25.5%</p>

          {/* Voucher input */}
          <div className="pt-1 border-t border-gray-100">
            <VoucherInput
              email={contact.email ?? ""}
              serviceType={pricing.serviceType}
              originalAmountCents={originalAmountCents}
              appliedVoucher={appliedVoucher}
              onApply={setAppliedVoucher}
            />
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {submissionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <span className="text-lg shrink-0">⚠️</span>
          <p className="text-[13px] text-red-700 m-0">{submissionError}</p>
        </div>
      )}

      {/* ── Legal note ───────────────────────────────────────────────────── */}
      <p className="text-[11px] text-gray-400 leading-relaxed">
        {t("legalNote")}
      </p>

      <StepActions
        onNext={handleSubmit}
        onBack={prevStep}
        nextLabel={isFree ? "Confirm booking" : t("confirm")}
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
          className="text-[12px] font-semibold text-[#7c9885] hover:text-[#3d6b47] transition-colors focus-visible:outline-none focus-visible:underline"
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
