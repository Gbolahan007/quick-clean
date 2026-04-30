"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEEP_PLANS, MAINTENANCE_PLANS } from "../data/plan";
import { APARTMENT_TYPES } from "../data/apartmentType";

// ─── Types ────────────────────────────────────────────────────────────────────

type Locale = "en" | "fi";
type ServiceType = "maintenance" | "deep";
type PlanKey = string;
type ApartmentType = (typeof APARTMENT_TYPES)[number];
type QtyMap = Record<string, number>;

export type AddonsSummary = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
};

// const EMPTY_ADDONS: AddonsSummary = {
//   selectedCount: 0,
//   rawTotal: 0,
//   discount: 0,
//   discountedTotal: 0,
//   qtyMap: {},
// };

// ─── State shape ──────────────────────────────────────────────────────────────

interface PricingState {
  locale: Locale;
  serviceType: ServiceType;
  showDeducted: boolean;
  selectedAptKey: string | null;
  selectedPlan: PlanKey;
  addonQtyMap: QtyMap;
}

interface PricingActions {
  toggleLocale: () => void;
  setServiceType: (index: number) => void;
  setShowDeducted: (index: number) => void;
  setSelectedAptKey: (key: string) => void;
  setSelectedPlan: (key: PlanKey) => void;
  setAddonQtyMap: (map: QtyMap) => void;
  resetAddons: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePricingStore = create<PricingState & PricingActions>()(
  persist(
    (set) => ({
      // ── Initial state ──
      locale: "en",
      serviceType: "maintenance",
      showDeducted: false,
      selectedAptKey: null,
      selectedPlan: "biweekly",
      addonQtyMap: {},

      // ── Actions ──
      toggleLocale: () =>
        set((s) => ({ locale: s.locale === "en" ? "fi" : "en" })),

      setServiceType: (index) => {
        const nextService: ServiceType = index === 0 ? "maintenance" : "deep";
        set({
          serviceType: nextService,

          selectedPlan:
            nextService === "maintenance" ? "biweekly" : "quarterly",

          addonQtyMap: {},
        });
      },

      setShowDeducted: (index) => set({ showDeducted: index === 1 }),

      setSelectedAptKey: (key) => set({ selectedAptKey: key }),

      setSelectedPlan: (key) => set({ selectedPlan: key }),

      setAddonQtyMap: (map) => set({ addonQtyMap: map }),

      resetAddons: () => set({ addonQtyMap: {} }),
    }),
    {
      name: "pricing-selections",
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        locale: state.locale,
        serviceType: state.serviceType,
        showDeducted: state.showDeducted,
        selectedAptKey: state.selectedAptKey,
        selectedPlan: state.selectedPlan,
        addonQtyMap: state.addonQtyMap,
      }),
    },
  ),
);

export function usePricingSelectors() {
  const {
    locale,
    serviceType,
    showDeducted,
    selectedAptKey,
    selectedPlan,
    addonQtyMap,
    toggleLocale,
    setServiceType,
    setShowDeducted,
    setSelectedAptKey,
    setSelectedPlan,
    setAddonQtyMap,
    resetAddons,
  } = usePricingStore();

  // Resolve full apt object from key
  const selectedApt: ApartmentType | null =
    APARTMENT_TYPES.find((a) => a.key === selectedAptKey) ?? null;

  // Derive plans from serviceType
  const plans = serviceType === "maintenance" ? MAINTENANCE_PLANS : DEEP_PLANS;

  // Wrap setSelectedAptKey so components can still pass the full object
  const setSelectedApt = (apt: ApartmentType) => setSelectedAptKey(apt.key);

  return {
    // State
    locale,
    serviceType,
    showDeducted,
    selectedApt,
    selectedPlan,
    addonQtyMap,
    plans,

    // Actions
    toggleLocale,
    handleServiceChange: setServiceType, // matches existing prop name
    handleVatChange: setShowDeducted, // matches existing prop name
    setSelectedApt,
    setSelectedPlan,
    setAddonQtyMap,
    resetAddons,
  };
}
