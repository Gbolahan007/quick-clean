// components/booking/BookingSidebar.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useBookingStore } from "@/app/store/useBookingStore";

export function BookingSidebar() {
  const tBooking = useTranslations("booking");
  const tPricing = useTranslations("pricing"); // ← add this

  const pricing = useBookingStore((s) => s.pricing);

  if (!pricing) return null;

  const {
    apartment,
    planLabel,
    serviceType,
    showDeducted,
    basePrice,
    addonsSummary,
    totalPrice,
  } = pricing;

  const hasAddons = addonsSummary.selectedCount > 0;
  const hasDiscount = addonsSummary.discount > 0;

  return (
    <aside className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(10,22,40,0.06)] overflow-hidden sticky top-6">
      {/* Header */}
      <div className="bg-[#0a1628] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50 mb-1">
          {tBooking("sidebar.yourBooking")}
        </p>
        <p className="text-white font-bold text-base leading-snug">
          {apartment.emoji} {tPricing(`apartments.${apartment.labelKey}`)} ·{" "}
          {apartment.size}
        </p>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Service + Plan */}
        <div className="space-y-2">
          <Row
            label={tBooking("sidebar.service")}
            value={tPricing(
              `serviceToggle.${serviceType === "maintenance" ? 0 : 1}`,
            )}
          />
          <Row label={tBooking("sidebar.plan")} value={planLabel} />
          <Row
            label={tBooking("sidebar.pricing")}
            value={
              showDeducted
                ? tBooking("sidebar.taxDeducted")
                : tBooking("sidebar.normalPrice")
            }
          />
        </div>

        <hr className="border-gray-100 m-0" />

        {/* Price breakdown */}
        <div className="space-y-2">
          <Row
            label={tBooking("sidebar.basePrice")}
            value={`€${basePrice}`}
            valueClass="font-semibold text-[#0a1628]"
          />

          {hasAddons && (
            <>
              <Row
                label={`${addonsSummary.selectedCount} ${tBooking("sidebar.addons")}`}
                value={
                  hasDiscount
                    ? `€${addonsSummary.discountedTotal}`
                    : `€${addonsSummary.rawTotal}`
                }
                valueClass="font-semibold text-[#0a1628]"
              />
              {hasDiscount && (
                <Row
                  label={tBooking("sidebar.discount10")}
                  value={`−€${addonsSummary.rawTotal - addonsSummary.discountedTotal}`}
                  valueClass="font-semibold text-[#3d6b47]"
                />
              )}
            </>
          )}
        </div>

        <hr className="border-gray-100 m-0" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {tBooking("sidebar.total")}
          </span>
          <span className="text-2xl font-extrabold text-[#0a1628] tracking-tight">
            €{totalPrice}
          </span>
        </div>

        {/* Trust signals */}
        <div className="bg-[#f0f8f3] rounded-xl p-3 space-y-1.5">
          {[
            tBooking("sidebar.trust1"),
            tBooking("sidebar.trust2"),
            tBooking("sidebar.trust3"),
          ].map((item) => (
            <p key={item} className="text-[12px] text-[#3d6b47] flex gap-2 m-0">
              <span>✓</span>
              <span>{item}</span>
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
  valueClass = "text-[#0a1628]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-gray-400 shrink-0">{label}</span>
      <span className={`text-[13px] font-medium text-right ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
