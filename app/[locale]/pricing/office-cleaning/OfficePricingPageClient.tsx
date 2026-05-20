"use client";

import { HoursSlider } from "@/app/components/office/HoursSlider";
import { PricingHeader } from "../components/PricingHeader";
import { PricingStoreProvider } from "../components/PricingStoreProvider";
import { useOfficePricingState } from "../hooks/useOfficePricingState";
import { TierIndicator } from "@/app/components/office/TierIndicator";
// import { OfficeSizeSelector } from "@/app/components/office/OfficeSizeSelector";
import { ScheduleSelector } from "@/app/components/office/ScheduleSelector";
import { SurchargeToggle } from "@/app/components/office/SurchargeToggle";
import { AddonsSelector } from "@/app/components/office/AddonsSelector";
import { InfoPanels, TrustBadges } from "@/app/components/office/InfoPanels";
import { PricingSummaryCard } from "@/app/components/office/PricingSummaryCard";
import { OfficeCTABar } from "@/app/components/office/OfficeCTABar";
import { useTranslations } from "next-intl";

type Props = { localeProp: "en" | "fi" };

function OfficePricingPageInner({ localeProp }: Props) {
  const t = useTranslations("pricing.office");

  const {
    stateLocale,
    toggleLocale,
    weeklyHours,
    selectedSpace,
    schedule,
    hasSurcharge,
    selectedAddons,
    addonsTotal,
    pricing,
    handleHoursChange,
    // setSelectedSpace,
    setSchedule,
    setHasSurcharge,
    toggleAddon,
    handleBook,
  } = useOfficePricingState({ localeProp });

  return (
    <div className="min-h-screen bg-[#f8faf9] font-sans ">
      <PricingHeader
        locale={stateLocale}
        serviceType="office"
        showDeducted={false}
        onLocale={toggleLocale}
        onServiceChange={() => {}}
        onVatChange={() => {}}
      />

      <div className="mx-auto max-w-5xl px-5 pb-40 pt-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="text-sm" aria-hidden>
              🏢
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
              {t("calculatorBadge")}
            </span>
          </div>

          <h1 className="text-[30px] sm:text-[38px] font-extrabold text-[#0a1628] tracking-tight leading-tight">
            {t("calculatorTitle")}{" "}
            <span className="text-[#7c9885]">
              {t("calculatorTitleHighlight")}
            </span>
          </h1>

          <p className="text-[14px] text-gray-500 mt-2 max-w-lg leading-relaxed">
            {t("calculatorSubtitle")}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* ── Left: inputs ─────────────────────────────────────────────── */}
          <div className="space-y-5">
            <Card>
              <HoursSlider value={weeklyHours} onChange={handleHoursChange} />
            </Card>

            <Card>
              <SectionLabel>{t("pricingTiers")}</SectionLabel>
              <TierIndicator activeTier={pricing?.tier ?? "tier1"} />
            </Card>

            {/* <Card>
              <OfficeSizeSelector
                selected={selectedSpace}
                onSelect={setSelectedSpace}
              />
            </Card> */}

            <Card>
              <ScheduleSelector selected={schedule} onSelect={setSchedule} />
            </Card>

            <SurchargeToggle value={hasSurcharge} onChange={setHasSurcharge} />

            <Card>
              <AddonsSelector
                selected={selectedAddons}
                onToggle={toggleAddon}
              />
            </Card>

            <InfoPanels />

            <p className="text-xs leading-relaxed text-[#0a1628]/40 border-t border-gray-200 pt-5">
              {t("disclaimer")}
            </p>
          </div>

          {/* ── Right: sticky summary ─────────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 space-y-4">
            <PricingSummaryCard pricing={pricing} addonsTotal={addonsTotal} />

            {pricing ? (
              <button
                type="button"
                onClick={handleBook}
                className="w-full rounded-xl bg-[#7c9885] px-6 py-4 text-[15px] font-bold text-white shadow-md shadow-[#7c9885]/40 transition-all duration-200 hover:bg-[#6f8c78] active:scale-[0.98] cursor-pointer"
              >
                {t("ctaBookContract")}
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-[12px] text-gray-400">
                  {t("ctaUnlockHint")}
                </p>
              </div>
            )}

            <TrustBadges />
          </div>
        </div>
      </div>

      <OfficeCTABar
        pricing={pricing}
        addonsTotal={addonsTotal}
        selectedSpace={selectedSpace}
        onBook={handleBook}
      />
    </div>
  );
}

export function OfficePricingPageClient(props: Props) {
  return (
    <PricingStoreProvider>
      <OfficePricingPageInner {...props} />
    </PricingStoreProvider>
  );
}

// ── Layout micro-components ───────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_2px_8px_rgba(10,22,40,0.04)]">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">
      {children}
    </p>
  );
}
