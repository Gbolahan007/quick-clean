"use client";

import { getTierCfg } from "../../[locale]/pricing/office-cleaning/constants";
import type { OfficePricingResult } from "@/app/types/office";
import type { ApartmentType } from "@/app/types/booking";
import { useTranslations } from "next-intl";

interface OfficeCTABarProps {
  pricing: OfficePricingResult | null;
  addonsTotal: number;
  selectedSpace: ApartmentType | null;
  onBook: () => void;
}

export function OfficeCTABar({
  pricing,
  addonsTotal,
  selectedSpace,
  onBook,
}: OfficeCTABarProps) {
  const t = useTranslations("pricing.office");

  if (!pricing) return null;

  const tierCfg = getTierCfg(pricing.tier);
  const total = Math.round(pricing.finalMonthly + addonsTotal);

  return (
    <>
      <div className="h-18" aria-hidden />

      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-between items-center gap-3 border-t border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4 shadow-[0_-4px_24px_rgba(10,22,40,0.07)]">
        <div className="hidden sm:block flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
            {t("ctaBarTitle")}
          </p>
          <p className="text-[13px] font-semibold text-[#0a1628] truncate">
            {selectedSpace && `${selectedSpace.size} · `}
            <span style={{ color: tierCfg.color }}>
              {t(`${pricing.tier}Label`)} · €{pricing.hourlyRate}/h
            </span>
            {" · "}
            {pricing.weeklyHours}h/week
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="sm:hidden text-[11px] text-slate-400 leading-none mb-0.5">
            {t("ctaBarMonthly")}
          </p>
          <p className="hidden sm:block text-[11px] text-slate-400 leading-none mb-0.5">
            {t("ctaBarMonthly")}
          </p>
          <p className="text-[18px] sm:text-[22px] font-extrabold tracking-tight text-[#0a1628]">
            €{total.toLocaleString("fi-FI")}
            <span className="text-[12px] sm:text-[13px] font-normal text-slate-400 ml-1">
              / mo
            </span>
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onBook}
          className="whitespace-nowrap shrink-0 rounded-xl bg-[#7c9885] px-5 sm:px-7 py-2.5 sm:py-3 text-[14px] sm:text-[15px] font-bold text-white shadow-md shadow-[#7c9885]/40 transition-all duration-200 hover:scale-[1.02] hover:bg-[#6f8c78] active:scale-[0.98] cursor-pointer"
        >
          {t("ctaBookContract")}
        </button>
      </div>
    </>
  );
}
