"use client";

import { useTranslations } from "next-intl";
import {
  OFFICE_ADDONS,
  type OfficeAddonKey,
} from "../../[locale]/pricing/office-cleaning/constants";

interface AddonsSelectorProps {
  selected: Set<OfficeAddonKey>;
  onToggle: (key: OfficeAddonKey, monthlyEst: number) => void;
}

export function AddonsSelector({ selected, onToggle }: AddonsSelectorProps) {
  const t = useTranslations("pricing.office");

  return (
    <div>
      <p className="text-[14px] font-bold text-[#0a1628] mb-1">
        {t("addonsTitle")}
      </p>
      <p className="text-[11px] text-gray-400 mb-3">{t("addonsHint")}</p>

      <div className="space-y-2" role="group" aria-label={t("addonsTitle")}>
        {OFFICE_ADDONS.map((addon) => {
          const isOn = selected.has(addon.key);
          const label = t(`addons.${addon.key}.label`);
          return (
            <label
              key={addon.key}
              className={[
                "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200",
                isOn
                  ? "border-[#7c9885] bg-[#f0f8f3]"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isOn}
                onChange={() => onToggle(addon.key, addon.monthlyEst)}
                aria-label={label}
              />
              <div
                className={[
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                  isOn
                    ? "bg-[#7c9885] border-[#7c9885]"
                    : "border-gray-300 bg-white",
                ].join(" ")}
                aria-hidden
              >
                {isOn && (
                  <span className="text-white text-[10px] font-bold">✓</span>
                )}
              </div>

              <span
                className={`text-[13px] font-medium flex-1 ${isOn ? "text-[#3d6b47]" : "text-[#0a1628]"}`}
              >
                {label}
              </span>

              <span className="text-[11px] text-gray-400 shrink-0">
                {addon.monthlyEst > 0
                  ? `~€${addon.monthlyEst}/mo`
                  : t("addonQuote")}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
