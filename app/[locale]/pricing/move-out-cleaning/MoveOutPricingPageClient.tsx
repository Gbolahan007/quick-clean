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
import { MOVE_OUT_PLANS } from "../data/moveOutPlans";

type Props = { localeProp: "en" | "fi" };

// ── Move-out specific info banner ─────────────────────────────────────────────

function MoveOutInfoBanner() {
  const t = useTranslations("pricing.moveout");
  return (
    <div className="mb-8 rounded-2xl border border-[#d4e8d9] bg-[#f0f8f3] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">🏠</span>
        <div className="space-y-1">
          <p className="text-[13px] font-bold text-[#0a1628]">
            {t("bannerTitle")}
          </p>
          <p className="text-[12px] leading-relaxed text-[#3d6b47]">
            {t("bannerDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Scope of service section ──────────────────────────────────────────────────

function MoveOutScopeSection() {
  const t = useTranslations("pricing.moveout");
  const included = t.raw("scopeIncluded") as string[];
  const addons = t.raw("scopeAddons") as string[];
  const notes = t.raw("scopeNotes") as string[];

  return (
    <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Included */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#7c9885]">
          {t("scopeIncludedTitle")}
        </p>
        <ul className="space-y-1.5">
          {included.map((item: string) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#7c9885]">✓</span>
              <span className="text-[12px] text-[#0a1628]/70">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Add-ons */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#7c9885]">
          {t("scopeAddonsTitle")}
        </p>
        <ul className="space-y-1.5">
          {addons.map((item: string) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#7c9885]">+</span>
              <span className="text-[12px] text-[#0a1628]/70">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 sm:col-span-2 lg:col-span-1">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-amber-600">
          {t("scopeNotesTitle")}
        </p>
        <ul className="space-y-1.5">
          {notes.map((item: string) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">ℹ</span>
              <span className="text-[12px] text-amber-800/80">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────────

function MoveOutPricingPageInner({ localeProp }: Props) {
  const t = useTranslations("pricing");

  const {
    locale,
    showDeducted,
    selectedApt,
    addonQtyMap,
    setAddonQtyMap,
    toggleLocale,
    setSelectedApt,
    setSelectedPlan,
    handleVatChange,
  } = usePricingState(localeProp);

  // Move-out has only one plan — auto-select it
  const selectedPlan = "moveout";

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
      {/* Header — reuses existing component, serviceType drives the title */}
      <PricingHeader
        locale={locale}
        serviceType="moveout"
        showDeducted={showDeducted}
        onLocale={toggleLocale}
        onServiceChange={() => {}} // move-out page doesn't toggle service type
        onVatChange={handleVatChange}
      />

      <div className="mx-auto max-w-225 px-5 pb-36">
        {/* Info banner */}
        <MoveOutInfoBanner />

        {/* Apartment Selector — fully reused */}
        <ApartmentSelector selected={selectedApt} onSelect={setSelectedApt} />

        {/* Plan Grid — single plan, no frequency toggle */}
        <PlanGrid
          plans={MOVE_OUT_PLANS}
          aptIdx={currentAptIdx}
          showDeducted={showDeducted}
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          serviceType="moveout"
        />

        {/* Pricing Table — fully reused */}
        <PricingTable
          plans={MOVE_OUT_PLANS}
          selectedPlan={selectedPlan}
          selectedApt={selectedApt}
          showDeducted={showDeducted}
          serviceType="moveout"
          onSelectApt={setSelectedApt}
        />

        {/* Scope of service */}
        <section className="mb-12">
          <h2 className="mb-5 text-[22px] font-black tracking-[-0.5px] text-[#0a1628]">
            {t("moveout.scopeTitle")}
          </h2>
          <MoveOutScopeSection />
        </section>

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

      {/* Sticky Summary Bar — fully reused */}
      <SummaryBar
        serviceType="moveout"
        apt={selectedApt}
        planKey={selectedPlan}
        plans={MOVE_OUT_PLANS}
        showDeducted={showDeducted}
        addonsSummary={addonsSummary}
      />
    </div>
  );
}

export function MoveOutPricingPageClient(props: Props) {
  return (
    <PricingStoreProvider>
      <MoveOutPricingPageInner {...props} />
    </PricingStoreProvider>
  );
}
