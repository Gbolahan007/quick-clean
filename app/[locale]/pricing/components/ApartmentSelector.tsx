"use client";

import { useTranslations } from "next-intl";
import { SectionLabel } from "./ui/Badge";
import { APARTMENT_TYPES } from "../data/apartmentType";

type ApartmentType = {
  key: string;
  labelKey: string;
  emoji: string;
  size: string;
};

type ApartmentSelectorProps = {
  selected: ApartmentType | null;
  onSelect: (apartment: ApartmentType) => void;
};

export function ApartmentSelector({
  selected,
  onSelect,
}: ApartmentSelectorProps) {
  const t = useTranslations("pricing");

  return (
    <div className="-mt-10 relative mb-8 z-50">
      <div className="bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(10,22,40,0.07)] border border-gray-200">
        <SectionLabel>{t("chooseApartment")}</SectionLabel>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
          {(APARTMENT_TYPES as ApartmentType[]).map((apt) => {
            const isActive = selected?.key === apt.key;

            return (
              <button
                key={apt.key}
                type="button"
                onClick={() => onSelect(apt)}
                className={`
                  p-[14px_16px] rounded-[14px] text-left transition-all
                  ${
                    isActive
                      ? "border-[2.5px] border-[#7c9885] bg-[#f0f8f3] shadow-[0_0_0_4px_rgba(124,152,133,0.15)]"
                      : "border border-gray-200 bg-gray-50"
                  }
                `}
              >
                <div className="text-lg mb-1">{apt.emoji}</div>

                <p
                  className={`text-[13px] font-bold mb-0.5 ${
                    isActive ? "text-[#3d6b47]" : "text-[#0a1628]"
                  }`}
                >
                  {t(`apartments.${apt.labelKey}`)}
                </p>

                <p className="text-[11px] text-gray-400 m-0">{apt.size}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
