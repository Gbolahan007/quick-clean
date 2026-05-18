"use client";

import { useTranslations } from "next-intl";
import {
  TIER_CONFIG,
  type TierKey,
} from "../../[locale]/pricing/office-cleaning/constants";

const TIER_RANGES: Record<TierKey, string> = {
  tier1: "2–10 hrs/week",
  tier2: "11–20 hrs/week",
  tier3: "21+ hrs/week",
};

interface TierIndicatorProps {
  activeTier: TierKey | string;
}

export function TierIndicator({ activeTier }: TierIndicatorProps) {
  const t = useTranslations("pricing.office");

  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-label={t("pricingTiers")}
    >
      {TIER_CONFIG.map((tier) => {
        const isActive = tier.key === activeTier;
        return (
          <div
            key={tier.key}
            className="rounded-xl border p-3 transition-all duration-300"
            style={{
              borderColor: isActive ? tier.border : "#e5e7eb",
              background: isActive ? tier.bg : "#fafafa",
              transform: isActive ? "scale(1.03)" : "scale(1)",
              boxShadow: isActive ? `0 0 0 3px ${tier.border}40` : "none",
            }}
            aria-current={isActive ? "true" : undefined}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: isActive ? tier.color : "#d1d5db" }}
                aria-hidden
              />
              <span
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: isActive ? tier.color : "#9ca3af" }}
              >
                {t(`${tier.key}Label`)}
              </span>
              {isActive && (
                <span
                  className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: tier.color }}
                >
                  {t("tierActive")}
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 mb-1">
              {TIER_RANGES[tier.key]}
            </p>

            <p
              className="text-[17px] font-extrabold leading-none transition-colors duration-300"
              style={{ color: isActive ? tier.color : "#d1d5db" }}
            >
              €{tier.rate}/h
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              €{tier.exVat}/h ex-VAT
            </p>
          </div>
        );
      })}
    </div>
  );
}
