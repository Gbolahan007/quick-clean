"use client";

import { useTranslations } from "next-intl";
import { usePricingState } from "./hooks/usePricingState";

import { PricingHeader } from "./components/PricingHeader";
import { ApartmentSelector } from "./components/ApartmentSelector";
import { PlanGrid } from "./components/PlanGrid";
import { PricingTable } from "./components/PricingTable";
import { AddonsSection } from "./components/AddonsSection";
import { SummaryBar } from "./components/SummaryBar";
import { aptIndex } from "./data/pricing";

type Props = {
  localeProp: "en" | "fi";
};

export default function PricingPage({ localeProp }: Props) {
  const t = useTranslations("pricing");

  const {
    locale,
    serviceType,
    showDeducted,
    selectedApt,
    selectedPlan,
    addonsSummary,
    plans,
    toggleLocale,
    setSelectedApt,
    setSelectedPlan,
    setAddonsSummary,
    handleServiceChange,
    handleVatChange,
  } = usePricingState(localeProp);

  const currentAptIdx = selectedApt ? aptIndex(selectedApt.key) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8faf9",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <PricingHeader
        locale={locale}
        serviceType={serviceType}
        showDeducted={showDeducted}
        onLocale={toggleLocale}
        onServiceChange={handleServiceChange}
        onVatChange={handleVatChange}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 140px" }}>
        <ApartmentSelector selected={selectedApt} onSelect={setSelectedApt} />

        <PlanGrid
          plans={plans}
          aptIdx={currentAptIdx}
          showDeducted={showDeducted}
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          serviceType={serviceType}
        />

        <PricingTable
          plans={plans}
          selectedPlan={selectedPlan}
          selectedApt={selectedApt}
          showDeducted={showDeducted}
          serviceType={serviceType}
          onSelectApt={setSelectedApt}
        />

        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#0a1628",
              margin: "0 0 4px",
              letterSpacing: "-0.5px",
            }}
          >
            {t("addonsTitle")}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(10,22,40,0.55)",
              margin: "0 0 20px",
            }}
          >
            {t("addonsSubtitle")}
          </p>

          <AddonsSection
            showDeducted={showDeducted}
            aptIdx={currentAptIdx}
            onChange={setAddonsSummary}
          />
        </section>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 24 }}>
          <p
            style={{
              fontSize: 12,
              color: "rgba(10,22,40,0.4)",
              lineHeight: 1.7,
              maxWidth: 640,
            }}
          >
            {t("disclaimer")}
          </p>
        </div>
      </div>

      {/* locale replaces onBook — navigation is now inside SummaryBar */}
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
