"use client";

import { useAnimatedNumber } from "@/app/lib/useAnimatedNumber";
import { getTierCfg } from "../../[locale]/pricing/office-cleaning/constants";
import type { OfficePricingResult } from "@/app/types/office";
import { useTranslations } from "next-intl";
interface PricingSummaryCardProps {
  pricing: OfficePricingResult | null;
  addonsTotal: number;
}

function formatEur(n: number): string {
  return n.toLocaleString("fi-FI");
}

export function PricingSummaryCard({
  pricing,
  addonsTotal,
}: PricingSummaryCardProps) {
  const t = useTranslations("pricing.office");

  const animWeekly = useAnimatedNumber(pricing?.weeklyCost ?? 0);
  const animMonthly = useAnimatedNumber(pricing?.finalMonthly ?? 0);
  const animTotal = useAnimatedNumber(
    pricing ? pricing.finalMonthly + addonsTotal : 0,
  );
  const tierCfg = pricing ? getTierCfg(pricing.tier) : getTierCfg("tier1");

  if (!pricing) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center ">
        <div className="text-3xl mb-2" aria-hidden>
          📊
        </div>
        <p className="text-[13px] font-semibold text-[#0a1628]">
          {t("estimateEmpty")}
        </p>
        <p className="text-[12px] text-gray-400 mt-1">
          {t("estimateEmptyHint")}
        </p>
      </div>
    );
  }

  const tierLabel = t(`${pricing.tier}Label`);

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-500 border-gray-200"
      style={{ borderColor: tierCfg.border }}
      aria-live="polite"
      aria-label={t("estimateLive")}
    >
      {/* Coloured header */}
      <div
        className="px-5 py-5 transition-colors duration-500"
        style={{ background: tierCfg.bg }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: tierCfg.color }}
          >
            {t("estimateLive")} · {tierLabel}
          </span>
          <span className="text-[11px] text-gray-500">incl. VAT 25.5%</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[42px] font-extrabold tracking-tighter text-[#0a1628] leading-none">
            €{formatEur(animTotal)}
          </span>
          <span className="text-[14px] text-gray-500">/ month</span>
        </div>
        <p
          className="text-[12px] mt-1.5 font-medium"
          style={{ color: tierCfg.color }}
        >
          {pricing.weeklyHours}h/week · €{pricing.hourlyRate}/h · ×4.2 weeks
        </p>
      </div>

      {/* Breakdown rows */}
      <div className="px-5 py-4 bg-white space-y-2.5 ">
        <Row label={t("estimateWeeklyCost")}>€{formatEur(animWeekly)}</Row>
        <Row label={t("estimateMonthly")}>€{formatEur(animMonthly)}</Row>

        {pricing.hasSurcharge && pricing.surchargeAmount > 0 && (
          <div className="flex justify-between text-[13px] ">
            <span className="text-amber-600">{t("estimateSurcharge")}</span>
            <span className="font-semibold text-amber-600  ">
              +€{Math.round(pricing.surchargeAmount)}
            </span>
          </div>
        )}

        {addonsTotal > 0 && (
          <Row label={t("estimateAddons")}>+€{addonsTotal}</Row>
        )}

        <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
          <span className="text-[13px] font-bold text-[#0a1628] ">
            {t("estimateTotal")}
          </span>
          <span
            className="text-[18px] font-extrabold transition-colors duration-500 "
            style={{ color: tierCfg.color }}
          >
            €{formatEur(animTotal)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          {t("estimateVatNote")}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold  text-[#0a1628]">{children}</span>
    </div>
  );
}
