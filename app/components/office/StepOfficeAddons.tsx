// app/components/office/StepOfficeAddons.tsx
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useOfficeBookingStore } from "@/app/store/useOfficeBookingStore";
import { StepActions } from "../booking/FormField";

const ADDON_KEYS = [
  "window_cleaning",
  "carpet_cleaning",
  "post_event",
  "supply_restocking",
] as const;

type AddonKey = (typeof ADDON_KEYS)[number];

// Monthly estimates — kept here to avoid an extra store field.
// These match OFFICE_ADDONS in the pricing calculator constants.
const MONTHLY_EST: Record<AddonKey, number> = {
  window_cleaning: 80,
  carpet_cleaning: 120,
  post_event: 0,
  supply_restocking: 60,
};

export function StepOfficeAddons() {
  const t = useTranslations("officeBooking.addons");
  const addons = useOfficeBookingStore((s) => s.addons);
  const saveAddons = useOfficeBookingStore((s) => s.saveAddons);
  const prevStep = useOfficeBookingStore((s) => s.prevStep);

  // Local selection state — initialised from store
  const [selected, setSelected] = useState<Set<AddonKey>>(
    new Set((addons.selected ?? []) as AddonKey[]),
  );

  const toggle = (key: AddonKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const monthlyTotal = Array.from(selected).reduce(
    (sum, key) => sum + MONTHLY_EST[key],
    0,
  );

  const handleNext = () => {
    saveAddons({
      selected: Array.from(selected) as AddonKey[],
      addonsMonthlyTotal: monthlyTotal,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-[#0a1628] tracking-tight">
          {t("title")}
        </h2>
        <p className="text-[13px] text-gray-400 mt-1">{t("subtitle")}</p>
      </div>

      <div className="space-y-2" role="group" aria-label={t("title")}>
        {ADDON_KEYS.map((key) => {
          const isOn = selected.has(key);
          const label = t(`items.${key}.label`);
          const note = t(`items.${key}.note`);
          const monthlyEst = MONTHLY_EST[key];

          return (
            <label
              key={key}
              className={[
                "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200",
                isOn
                  ? "border-[#7c9885] bg-[#f0f8f3]"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isOn}
                onChange={() => toggle(key)}
                aria-label={label}
              />
              {/* Custom checkbox */}
              <div
                className={[
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
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

              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-semibold ${isOn ? "text-[#3d6b47]" : "text-[#0a1628]"}`}
                >
                  {label}
                </p>
                {note && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>
                )}
              </div>

              <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
                {monthlyEst > 0 ? `~€${monthlyEst}/mo` : "Quote"}
              </span>
            </label>
          );
        })}
      </div>

      {/* Running total */}
      {monthlyTotal > 0 && (
        <div className="rounded-xl border border-[#d4e8d9] bg-[#f0f8f3] px-4 py-3 flex justify-between items-center">
          <span className="text-[13px] font-semibold text-[#0a1628]">
            Add-ons monthly estimate
          </span>
          <span className="text-[15px] font-extrabold text-[#3d6b47]">
            +€{monthlyTotal}
          </span>
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Add-ons are included in your monthly contract. Final costs confirmed
        before contract start.
      </p>

      <StepActions
        onNext={handleNext}
        onBack={prevStep}
        nextLabel={t("next")}
        backLabel={t("back")}
      />
    </div>
  );
}
