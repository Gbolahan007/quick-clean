"use client";

import { useTranslations } from "next-intl";
import { OFFICE_SPACE_TYPES } from "../../[locale]/pricing/data/officeSpaceTypes";
import type { ApartmentType } from "@/app/types/booking";

interface OfficeSizeSelectorProps {
  selected: ApartmentType | null;
  onSelect: (space: ApartmentType) => void;
}

export function OfficeSizeSelector({
  selected,
  onSelect,
}: OfficeSizeSelectorProps) {
  const tOffice = useTranslations("pricing.office");
  const tApts = useTranslations("pricing.apartments");

  return (
    <div>
      <p className="text-[14px] font-bold text-[#0a1628] mb-1">
        {tOffice("sizeTitle")}
      </p>
      <p className="text-[11px] text-gray-400 mb-3">{tOffice("sizeHint")}</p>

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        role="radiogroup"
        aria-label={tOffice("sizeTitle")}
      >
        {OFFICE_SPACE_TYPES.map((space) => {
          const isActive = selected?.key === space.key;
          return (
            <button
              key={space.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(space)}
              className={[
                "p-3 rounded-xl border text-left transition-all duration-200",
                isActive
                  ? "border-[#7c9885] bg-[#f0f8f3] shadow-[0_0_0_3px_rgba(124,152,133,0.15)]"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <div className="text-lg mb-0.5" aria-hidden>
                {space.emoji}
              </div>
              <p
                className={`text-[12px] font-bold leading-tight ${isActive ? "text-[#3d6b47]" : "text-[#0a1628]"}`}
              >
                {tApts(space.labelKey)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{space.size}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
