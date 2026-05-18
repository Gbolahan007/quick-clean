"use client";

import { useTranslations } from "next-intl";

interface SurchargeToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function SurchargeToggle({ value, onChange }: SurchargeToggleProps) {
  const t = useTranslations("pricing.office");

  return (
    <label
      className={[
        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200",
        value
          ? "border-amber-300 bg-amber-50"
          : "border-gray-200 bg-white hover:border-amber-200",
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={t("surchargeLabel")}
      />
      <div
        className={[
          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
          value ? "bg-amber-400 border-amber-400" : "border-gray-300 bg-white",
        ].join(" ")}
        aria-hidden
      >
        {value && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[#0a1628]">
          {t("surchargeLabel")}
        </p>
        <p className="text-[12px] text-gray-500 mt-0.5">{t("surchargeHint")}</p>
      </div>
    </label>
  );
}
