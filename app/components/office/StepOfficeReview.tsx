// app/components/office/StepOfficeReview.tsx
"use client";

import { useTranslations } from "next-intl";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";

// Day names for schedule display
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Workspace type display labels
const WORKSPACE_LABELS: Record<string, string> = {
  open_plan: "Open plan",
  private_offices: "Private offices",
  coworking: "Co-working space",
  mixed: "Mixed layout",
  warehouse: "Warehouse / industrial",
};

export function StepOfficeReview() {
  const t = useTranslations("officeBooking.review");

  const details = useOfficeBookingStore((s) => s.details);
  const schedule = useOfficeBookingStore((s) => s.schedule);
  const addons = useOfficeBookingStore((s) => s.addons);
  const contact = useOfficeBookingStore((s) => s.contact);
  const address = useOfficeBookingStore((s) => s.address);
  const pricing = useOfficeBookingStore((s) => s.pricing);
  const prevStep = useOfficeBookingStore((s) => s.prevStep);
  const submitBooking = useOfficeBookingStore((s) => s.submitOfficeBooking);
  const isSubmitting = useOfficeBookingStore((s) => s.isSubmitting);
  const submissionError = useOfficeBookingStore((s) => s.submissionError);

  const total = pricing
    ? Math.round(pricing.finalMonthly + (addons.addonsMonthlyTotal ?? 0))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
          {t("title")}
        </h2>
        <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
      </div>

      {/* ── Office details ───────────────────────────────────────────────── */}
      <ReviewSection title={t("sections.office")}>
        <ReviewRow label={t("fields.officeName")} value={details.officeName} />
        <ReviewRow
          label={t("fields.workspaceType")}
          value={
            WORKSPACE_LABELS[details.workspaceType ?? ""] ??
            details.workspaceType
          }
        />
        <ReviewRow
          label={t("fields.officeSizeSqm")}
          value={details.officeSizeSqm ? `${details.officeSizeSqm} m²` : "—"}
        />
        <ReviewRow
          label={t("fields.staffCount")}
          value={details.staffCount != null ? String(details.staffCount) : "—"}
        />
      </ReviewSection>

      {/* ── Cleaning schedule ────────────────────────────────────────────── */}
      <ReviewSection title={t("sections.schedule")}>
        <ReviewRow
          label={t("fields.weeklyHours")}
          value={`${schedule.weeklyHours ?? 0}h/week`}
        />
        {pricing && (
          <>
            <ReviewRow
              label={t("fields.pricingTier")}
              value={pricing.tier.toUpperCase()}
            />
            <ReviewRow
              label={t("fields.hourlyRate")}
              value={`€${pricing.hourlyRate}/h incl. VAT`}
            />
            <ReviewRow
              label={t("fields.weeklyCost")}
              value={`€${Math.round(pricing.weeklyCost)}`}
            />
          </>
        )}
        {pricing?.hasSurcharge && (
          <ReviewRow
            label={t("fields.surcharge")}
            value={`+€${Math.round(pricing.surchargeAmount)} (+15%)`}
            amber
          />
        )}

        {/* Recurring days */}
        {(schedule.recurringRules?.length ?? 0) > 0 && (
          <div className="mt-2 space-y-1">
            {schedule.recurringRules!.map((rule) => (
              <div
                key={rule.dayOfWeek}
                className="flex justify-between text-[12px]"
              >
                <span className="text-[#0a1628]/60">
                  {DAY_NAMES[rule.dayOfWeek]}
                </span>
                <span className="font-medium text-[#0a1628]">
                  {rule.startTime} · {rule.durationHours}h
                </span>
              </div>
            ))}
          </div>
        )}
      </ReviewSection>

      {/* ── Add-ons ──────────────────────────────────────────────────────── */}
      {(addons.selected?.length ?? 0) > 0 && (
        <ReviewSection title={t("sections.addons")}>
          {addons.selected!.map((key) => (
            <ReviewRow key={key} label={key.replace(/_/g, " ")} value="" />
          ))}
          {addons.addonsMonthlyTotal > 0 && (
            <ReviewRow
              label={t("fields.addons")}
              value={`~€${addons.addonsMonthlyTotal}/mo`}
            />
          )}
        </ReviewSection>
      )}

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <ReviewSection title={t("sections.contact")}>
        <ReviewRow
          label="Name"
          value={`${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()}
        />
        <ReviewRow label="Email" value={contact.email ?? "—"} />
        <ReviewRow label="Phone" value={contact.phone ?? "—"} />
      </ReviewSection>

      {/* ── Address ──────────────────────────────────────────────────────── */}
      <ReviewSection title={t("sections.address")}>
        <ReviewRow
          label="Address"
          value={[
            address.streetAddress,
            address.apartmentNumber,
            address.postalCode,
            address.city,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        {address.accessInstructions && (
          <ReviewRow label="Access" value={address.accessInstructions} />
        )}
      </ReviewSection>

      {/* ── Pricing summary ──────────────────────────────────────────────── */}
      <ReviewSection title={t("sections.pricing")}>
        {pricing && (
          <ReviewRow
            label={t("fields.monthlyCost")}
            value={`€${Math.round(pricing.finalMonthly)}`}
          />
        )}
        {(addons.addonsMonthlyTotal ?? 0) > 0 && (
          <ReviewRow
            label={t("fields.addons")}
            value={`+€${addons.addonsMonthlyTotal}`}
          />
        )}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
          <span className="text-[13px] font-bold text-[#0a1628]">
            {t("fields.total")}
          </span>
          <span className="text-[18px] font-extrabold text-[#3d6b47]">
            €{total}/mo
          </span>
        </div>
      </ReviewSection>

      {/* ── Legal note ───────────────────────────────────────────────────── */}
      <p className="text-[11px] text-gray-400 leading-relaxed">
        {t("contractNote")}
      </p>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {submissionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-red-600">
            ⚠ {submissionError}
          </p>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={prevStep}
          disabled={isSubmitting}
          className="px-5 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#0a1628] hover:border-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={submitBooking}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 rounded-xl bg-[#7c9885] text-[14px] font-bold text-white hover:bg-[#6f8c78] transition-colors disabled:opacity-60 cursor-pointer shadow-md shadow-[#7c9885]/30"
        >
          {isSubmitting ? "Submitting…" : t("confirm")}
        </button>
      </div>
    </div>
  );
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  amber = false,
}: {
  label: string;
  value?: string;
  amber?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-[12px]">
      <span className={amber ? "text-amber-600" : "text-[#0a1628]/55"}>
        {label}
      </span>
      <span
        className={`font-semibold text-right ${amber ? "text-amber-600" : "text-[#0a1628]"}`}
      >
        {value}
      </span>
    </div>
  );
}
