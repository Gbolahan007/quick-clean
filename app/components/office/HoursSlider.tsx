"use client";

import { useTranslations } from "next-intl";
import { resolveTier } from "../../[locale]/pricing/data/lib/officePricing";
import { getTierCfg } from "../../[locale]/pricing/office-cleaning/constants";

interface HoursSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function HoursSlider({ value, onChange }: HoursSliderProps) {
  const t = useTranslations("pricing.office");
  const tier = resolveTier(Math.max(value, 2));
  const tierCfg = getTierCfg(tier.key);
  const pct = Math.min(((value - 2) / (30 - 2)) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <label className="text-[14px] font-bold text-[#0a1628]">
            {t("hoursLabel")}
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          </label>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("hoursHint")}</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <input
            type="number"
            min={2}
            max={60}
            value={value}
            aria-label={t("hoursLabel")}
            onChange={(e) =>
              onChange(Math.max(2, parseInt(e.target.value) || 2))
            }
            className="w-16 text-right border border-gray-200 rounded-lg px-2 py-1 text-[18px] font-extrabold text-[#0a1628] focus:outline-none focus:border-[#7c9885] transition-colors"
          />
          <span className="text-[12px] text-gray-400">{t("hoursUnit")}</span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-3 rounded-full bg-gray-100">
        <div
          className="absolute h-3 rounded-full transition-all duration-300 pointer-events-none"
          style={{ width: `${pct}%`, background: tierCfg.color }}
        />
        <input
          type="range"
          min={2}
          max={30}
          step={1}
          value={Math.min(value, 30)}
          aria-label={t("hoursLabel")}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all duration-300 pointer-events-none"
          style={{ left: `calc(${pct}% - 10px)`, background: tierCfg.color }}
          aria-hidden
        />
      </div>

      {/* Tier boundary markers — numeric ranges are not translated */}
      <div className="relative flex text-[10px] font-semibold select-none">
        <span className="text-gray-400">2h</span>
        <span className="absolute" style={{ left: "28%" }}>
          <span className="text-gray-300" aria-hidden>
            |
          </span>
          <span className="text-[#7c9885] ml-0.5">
            10h · {t("tier2Label")} →
          </span>
        </span>
        <span className="absolute" style={{ left: "61%" }}>
          <span className="text-gray-300" aria-hidden>
            |
          </span>
          <span className="text-[#4a7c6b] ml-0.5">
            20h · {t("tier3Label")} →
          </span>
        </span>
        <span className="ml-auto text-gray-400">30h+</span>
      </div>
    </div>
  );
}
