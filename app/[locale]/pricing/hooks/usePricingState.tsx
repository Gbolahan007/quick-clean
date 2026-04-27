"use client";

import { useState } from "react";
import { DEEP_PLANS, MAINTENANCE_PLANS } from "../data/plan";
import { APARTMENT_TYPES } from "../data/apartmentType";

type Locale = "en" | "fi";
type ServiceType = "maintenance" | "deep";
type PlanKey = string;

type ApartmentType = (typeof APARTMENT_TYPES)[number];

type QtyMap = Record<string, number>;

type AddonsSummary = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
};

const EMPTY_ADDONS: AddonsSummary = {
  selectedCount: 0,
  rawTotal: 0,
  discount: 0,
  discountedTotal: 0,
  qtyMap: {},
};

/**
 * usePricingState
 *
 * Owns every piece of state that lives at the PricingPage level:
 * locale, serviceType, showDeducted, selectedApt, selectedPlan, addonsSummary
 *
 * No useEffect needed. We update dependent state directly inside handlers.
 */
export function usePricingState(initialLocale: Locale = "en") {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [serviceType, setServiceType] = useState<ServiceType>("maintenance");
  const [showDeducted, setShowDeducted] = useState<boolean>(false);
  const [selectedApt, setSelectedApt] = useState<ApartmentType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("biweekly");
  const [addonsSummary, setAddonsSummary] =
    useState<AddonsSummary>(EMPTY_ADDONS);

  const plans = serviceType === "maintenance" ? MAINTENANCE_PLANS : DEEP_PLANS;

  const toggleLocale = (): void => {
    setLocale((prev) => (prev === "en" ? "fi" : "en"));
  };

  /**
   * 0 = maintenance
   * 1 = deep
   */
  const handleServiceChange = (index: number): void => {
    const nextService: ServiceType = index === 0 ? "maintenance" : "deep";

    setServiceType(nextService);

    setSelectedPlan(nextService === "maintenance" ? "biweekly" : "quarterly");
  };

  /**
   * 0 = normal price
   * 1 = tax-deducted price
   */
  const handleVatChange = (index: number): void => {
    setShowDeducted(index === 1);
  };

  return {
    // State
    locale,
    serviceType,
    showDeducted,
    selectedApt,
    selectedPlan,
    addonsSummary,
    plans,

    // Setters / handlers
    toggleLocale,
    setSelectedApt,
    setSelectedPlan,
    setAddonsSummary,
    handleServiceChange,
    handleVatChange,
  };
}
