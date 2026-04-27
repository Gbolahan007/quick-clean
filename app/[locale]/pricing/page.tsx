"use client";

import { useTranslations } from "next-intl";
import { usePricingState } from "./hooks/usePricingState";

import { PricingHeader } from "./components/PricingHeader";
import { ApartmentSelector } from "./components/ApartmentSelector";
import { PlanGrid } from "./components/PlanGrid";
import { PricingTable } from "./components/PricingTable";
import { AddonsSection } from "./components/AddonsSection";
import { SummaryBar } from "./components/SummaryBar";
import { aptIndex, buildBookingParams } from "./data/pricing";

type Props = {
  localeProp: "en" | "fi";
};
/**
 * PricingPage
 *
 * Thin orchestrator. All state lives in usePricingState; all UI is in the
 * imported components. This file should only contain wiring — no styles,
 * no business logic.
 *
 * Props:
 *   locale  "en" | "fi"  (passed from the Next.js route segment)
 */
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

  // ── Booking hand-off ────────────────────────────────────────────────────────
  const handleBook = () => {
    const params = buildBookingParams({
      serviceType,
      apt: selectedApt,
      plan: selectedPlan,
      showDeducted,
      addons: addonsSummary.qtyMap ?? {},
    });

    // In production: router.push(`/booking?${params}`)
    // eslint-disable-next-line no-alert
    alert(
      `Redirecting to: /booking?${params}\n\n(Replace this alert with router.push in production)`,
    );
  };

  // ── Derived values used by multiple children ────────────────────────────────
  const currentAptIdx = selectedApt ? aptIndex(selectedApt.key) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8faf9",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── 1. Hero header with toggles ── */}
      <PricingHeader
        locale={locale}
        serviceType={serviceType}
        showDeducted={showDeducted}
        onLocale={toggleLocale}
        onServiceChange={handleServiceChange}
        onVatChange={handleVatChange}
      />

      {/* ── 2. Main content ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 140px" }}>
        {/* 2a. Apartment type selector */}
        <ApartmentSelector selected={selectedApt} onSelect={setSelectedApt} />

        {/* 2b. Plan cards */}
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

        {/* 2d. Optional add-ons */}
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

        {/* 2e. Legal disclaimer */}
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

      {/* ── 3. Sticky booking bar ── */}
      <SummaryBar
        serviceType={serviceType}
        apt={selectedApt}
        planKey={selectedPlan}
        plans={plans}
        showDeducted={showDeducted}
        addonsSummary={addonsSummary}
        onBook={handleBook}
      />
    </div>
  );
}
