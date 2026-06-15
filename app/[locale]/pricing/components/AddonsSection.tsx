"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAddonState } from "../hooks/useAddonState";
import { ADDONS } from "../data/addOns";

export type QtyMap = Record<string, number>;

export type AddonsSummary = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
};

export interface Addon {
  key: string;
  labelKey: string;
  noteKey?: string;
  price: number;
  deducted: number;
  perLoad?: boolean;
  prominent?: boolean;
}

interface AddonsSectionProps {
  showDeducted: boolean;
  aptIdx: number | null;
  onChange: (summary: AddonsSummary) => void;
}

export function AddonsSection({
  showDeducted,
  aptIdx,
  onChange,
}: AddonsSectionProps) {
  const t = useTranslations("pricing");

  const { qtyMap, toggle, decrement, increment, summary } = useAddonState(
    showDeducted,
    onChange,
  );

  const { selectedCount, rawTotal, discount, discountedTotal } = summary;

  return (
    <div>
      {/* Intro note */}
      <p className="mb-4 text-[13px] text-[#0a1628]/55">{t("addonsNote")}</p>

      {/* Discount banner */}
      {selectedCount >= 2 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-[#7c9885]/35 bg-[#edf7f0] px-4 py-2.5">
          <span className="text-base text-[#7c9885]">✓</span>

          <span className="text-[13px] font-bold text-[#3d6b47]">
            {t("discount10")}
          </span>
        </div>
      )}

      {/* Addon List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        {ADDONS.map((addon, i) => {
          const qty = qtyMap[addon.key] ?? 0;
          const isOn = qty > 0;

          const price = showDeducted ? addon.deducted : addon.price;

          const showRecommend =
            addon.prominent && aptIdx !== null && aptIdx >= 2;

          const rowBg = isOn
            ? "bg-[#f0f8f3]"
            : i % 2 === 0
              ? "bg-white"
              : "bg-gray-50";

          return (
            <div
              key={addon.key}
              className={`flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0 ${rowBg}`}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggle(addon.key, !!addon.perLoad)}
                className={`flex h-5.5 w-5.5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 transition-all ${
                  isOn
                    ? "border-[#7c9885] bg-[#7c9885]"
                    : "border-gray-300 bg-white"
                }`}
              >
                {isOn && (
                  <span className="text-[11px] font-bold text-white">✓</span>
                )}
              </button>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p
                    className={`text-sm font-semibold ${
                      isOn ? "text-[#3d6b47]" : "text-[#0a1628]"
                    }`}
                  >
                    {t(`addons.${addon.labelKey}.label`)}
                  </p>

                  {showRecommend && (
                    <span className="rounded-full bg-[#7c9885]/10 px-2 py-0.5 text-[10px] font-bold text-[#4a6b52]">
                      ★ {t("recommendedShort")}
                    </span>
                  )}
                </div>

                {addon.noteKey && (
                  <p className="mt-0.5 text-[11px] text-[#0a1628]/50">
                    {t(`addons.${addon.noteKey}.note`)}
                  </p>
                )}

                {addon.prominent && (
                  <p className="mt-0.5 text-[11px] text-[#7c9885]/80">
                    {t("saunaNote")}
                  </p>
                )}
              </div>

              {/* Stepper */}
              {addon.perLoad && isOn && (
                <div className="flex items-center gap-1.5">
                  <StepBtn onClick={() => decrement(addon.key)}>−</StepBtn>

                  <span className="min-w-4 text-center text-sm font-bold text-[#0a1628]">
                    {qty}
                  </span>

                  <StepBtn onClick={() => increment(addon.key)}>+</StepBtn>

                  <span className="text-[11px] text-[#0a1628]/45">
                    {t("loads")}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="shrink-0 text-right">
                <span className="text-[15px] font-bold text-[#0a1628]">
                  €{price}
                </span>

                {addon.perLoad && (
                  <span className="block text-[11px] text-[#0a1628]/45">
                    {t("perLoad")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Summary */}
      {selectedCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0a1628] px-5 py-4">
          <span className="text-[13px] text-white/65">
            {selectedCount} {t("addonsSelected")}
          </span>

          <div className="text-right">
            {discount > 0 && (
              <p className="mb-0.5 text-xs text-white/40 line-through">
                {t("originalTotal")}: €{rawTotal}
              </p>
            )}

            <p className="text-lg font-extrabold text-white">
              {t("discountedTotal")}: €{discountedTotal}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepBtnProps {
  onClick: () => void;
  children: React.ReactNode;
}

function StepBtn({ onClick, children }: StepBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-sm transition hover:bg-gray-50"
    >
      {children}
    </button>
  );
}
