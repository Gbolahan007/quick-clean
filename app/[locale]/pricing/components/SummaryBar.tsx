"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { aptIndex, getPrice } from "../data/pricing";
import {
  AddonsSummary,
  ApartmentType,
  Plan,
  ServiceType,
} from "@/app/types/booking";
import { useInitBooking } from "@/app/hooks/useInitBooking";

export type { ApartmentType, Plan, AddonsSummary };

interface SummaryBarProps {
  serviceType: ServiceType;
  apt: ApartmentType | null;
  planKey: string | null;
  plans: Record<string, Plan>;
  showDeducted: boolean;
  addonsSummary: AddonsSummary;
}

export function SummaryBar({
  serviceType,
  apt,
  planKey,
  plans,
  showDeducted,
  addonsSummary,
}: SummaryBarProps) {
  const t = useTranslations("pricing");

  const { onBook } = useInitBooking({
    serviceType,
    apt,
    planKey,
    plans,
    showDeducted,
    addonsSummary,
  });

  if (!apt || !planKey) return null;

  const plan = plans[planKey];
  const idx = aptIndex(apt.key);

  const basePrice = plan ? (getPrice(plan, idx, showDeducted) ?? 0) : 0;
  const total = basePrice + (addonsSummary?.discountedTotal ?? 0);

  const aptLabel = t(`apartments.${apt.labelKey}`);
  const planLabel = plan ? t(`plans.${plan.labelKey}`) : "—";

  const addonCount = addonsSummary?.selectedCount ?? 0;
  const addonSuffix =
    addonCount > 0 ? ` + ${addonCount} ${t("addonsSelected")}` : "";

  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-4px_24px_rgba(10,22,40,0.07)]">
      {/* Left Content */}
      <div className="min-w-50 flex-1">
        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-900/45">
          {t("summary")}
        </p>

        <p className="text-[13px] font-semibold text-slate-900">
          {aptLabel} · {planLabel}
          {addonSuffix}
        </p>
      </div>

      {/* Price */}
      <div className="text-right">
        <p className="mb-0.5 text-[11px] text-slate-900/45">{t("livePrice")}</p>

        <p className="text-[22px] font-extrabold tracking-[-0.5px] text-slate-900">
          €{total}
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onBook}
        className="whitespace-nowrap rounded-xl bg-[#7c9885] px-7 cursor-pointer py-3 text-[15px] font-bold text-white shadow-md shadow-[#7c9885]/40 transition-all duration-200 hover:scale-[1.02] hover:bg-[#6f8c78] active:scale-[0.98]"
      >
        {t("bookNow")} →
      </button>
    </div>
  );
}
