// app/[locale]/pricing/PricingPageClient.tsx
"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { usePricingState } from "../hooks/usePricingState";
import { aptIndex, calcAddonTotals } from "../data/pricing";
import { PricingHeader } from "../components/PricingHeader";
import { ApartmentSelector } from "../components/ApartmentSelector";
import { PlanGrid } from "../components/PlanGrid";
import { PricingTable } from "../components/PricingTable";
import { SummaryBar } from "../components/SummaryBar";
import { PricingStoreProvider } from "../components/PricingStoreProvider";
import { AddonsSection } from "../components/AddonsSection";

type Props = {
  localeProp: "en" | "fi";
};

// ─── Inner component (runs after store is hydrated) ───────────────────────────

function PricingPageInner({ localeProp }: Props) {
  const t = useTranslations("pricing");

  const {
    locale,
    serviceType,
    showDeducted,
    selectedApt,
    selectedPlan,
    addonQtyMap, // ← raw qty map from the store
    setAddonQtyMap, // ← setter for the raw qty map
    plans,
    toggleLocale,
    setSelectedApt,
    setSelectedPlan,
    handleServiceChange,
    handleVatChange,
  } = usePricingState(localeProp);

  const addonsSummary = useMemo(
    () => ({
      ...calcAddonTotals(addonQtyMap, showDeducted),
      qtyMap: addonQtyMap,
    }),
    [addonQtyMap, showDeducted],
  );

  const handleAddonsChange = (summary: typeof addonsSummary) => {
    setAddonQtyMap(summary.qtyMap);
  };

  const currentAptIdx = selectedApt ? aptIndex(selectedApt.key) : null;

  return (
    <div className="min-h-screen bg-[#f8faf9] font-sans">
      {/* Header */}
      <PricingHeader
        locale={locale}
        serviceType={serviceType}
        showDeducted={showDeducted}
        onLocale={toggleLocale}
        onServiceChange={handleServiceChange}
        onVatChange={handleVatChange}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-225 px-5 pb-36">
        {/* Apartment Selector */}
        <ApartmentSelector selected={selectedApt} onSelect={setSelectedApt} />

        {/* Plan Cards */}
        <PlanGrid
          plans={plans}
          aptIdx={currentAptIdx}
          showDeducted={showDeducted}
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          serviceType={serviceType}
        />

        {/* Pricing Table */}
        <PricingTable
          plans={plans}
          selectedPlan={selectedPlan}
          selectedApt={selectedApt}
          showDeducted={showDeducted}
          serviceType={serviceType}
          onSelectApt={setSelectedApt}
        />

        {/* Add-ons */}
        <section className="mb-12">
          <h2 className="mb-1 text-[22px] font-black tracking-[-0.5px] text-[#0a1628]">
            {t("addonsTitle")}
          </h2>

          <p className="mb-5 text-sm text-[#0a1628]/55">
            {t("addonsSubtitle")}
          </p>

          <AddonsSection
            showDeducted={showDeducted}
            aptIdx={currentAptIdx}
            onChange={handleAddonsChange}
          />
        </section>

        {/* Disclaimer */}
        <div className="border-t border-gray-200 pt-6">
          <p className="max-w-160 text-xs leading-7 text-[#0a1628]/40">
            {t("disclaimer")}
          </p>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      <SummaryBar
        serviceType={serviceType}
        apt={selectedApt}
        planKey={selectedPlan}
        plans={plans}
        showDeducted={showDeducted}
        addonsSummary={addonsSummary}
      />
    </div>
  );
}

// ─── Exported wrapper (handles SSR hydration guard) ───────────────────────────

export function PricingPageClient(props: Props) {
  return (
    <PricingStoreProvider>
      <PricingPageInner {...props} />
    </PricingStoreProvider>
  );
}
