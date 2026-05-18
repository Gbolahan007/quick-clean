"use client";

import { useTranslations } from "next-intl";
import {
  SCHEDULE_PRESETS,
  type ScheduleKey,
} from "../../[locale]/pricing/office-cleaning/constants";

const SCHEDULE_LABEL_KEYS: Record<ScheduleKey, string> = {
  daily: "scheduleDaily",
  "3days": "schedule3Days",
  "2days": "schedule2Days",
  custom: "scheduleCustom",
};

interface ScheduleSelectorProps {
  selected: ScheduleKey;
  onSelect: (key: ScheduleKey) => void;
}

export function ScheduleSelector({
  selected,
  onSelect,
}: ScheduleSelectorProps) {
  const t = useTranslations("pricing.office");

  return (
    <div>
      <p className="text-[14px] font-bold text-[#0a1628] mb-1">
        {t("scheduleTitle")}
      </p>
      <p className="text-[11px] text-gray-400 mb-3">{t("scheduleHint")}</p>

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        role="radiogroup"
        aria-label={t("scheduleTitle")}
      >
        {SCHEDULE_PRESETS.map((preset) => {
          const isActive = selected === preset.distribKey;
          const labelKey = SCHEDULE_LABEL_KEYS[preset.distribKey];
          return (
            <button
              key={preset.distribKey}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(preset.distribKey)}
              className={[
                "px-3 py-3 rounded-xl border text-[12px] font-semibold transition-all duration-200",
                isActive
                  ? "border-[#7c9885] bg-[#f0f8f3] text-[#3d6b47]"
                  : "border-gray-200 bg-white text-[#0a1628] hover:border-gray-300",
              ].join(" ")}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
