"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { calculateOfficePricing } from "../../../[locale]/pricing/data/lib/officePricing";
import { usePricingState } from "./usePricingState";
import type { OfficePricingResult } from "@/app/types/office";
import type { ApartmentType } from "@/app/types/booking";
import type {
  OfficeAddonKey,
  ScheduleKey,
} from "../../../[locale]/pricing/office-cleaning/constants";

interface UseOfficePricingStateProps {
  localeProp: "en" | "fi";
}

export function useOfficePricingState({
  localeProp,
}: UseOfficePricingStateProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? localeProp;

  // ── Header state (locale + VAT toggle) from existing pricing hook ──────────
  const { locale: stateLocale, toggleLocale } = usePricingState(localeProp);

  // ── Calculator state ────────────────────────────────────────────────────────
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [selectedSpace, setSelectedSpace] = useState<ApartmentType | null>(
    null,
  );
  const [schedule, setSchedule] = useState<ScheduleKey>("daily");
  const [hasSurcharge, setHasSurcharge] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<Set<OfficeAddonKey>>(
    new Set(),
  );
  const [addonsTotal, setAddonsTotal] = useState(0);
  const [pricing, setPricing] = useState<OfficePricingResult | null>(null);

  // ── Live pricing recalculation ──────────────────────────────────────────────
  useEffect(() => {
    if (weeklyHours >= 2) {
      try {
        setPricing(calculateOfficePricing(weeklyHours, hasSurcharge));
      } catch {
        setPricing(null);
      }
    }
  }, [weeklyHours, hasSurcharge]);

  // ── Addon toggle ────────────────────────────────────────────────────────────
  const toggleAddon = useCallback((key: OfficeAddonKey, monthlyEst: number) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setAddonsTotal((t) => t - monthlyEst);
      } else {
        next.add(key);
        setAddonsTotal((t) => t + monthlyEst);
      }
      return next;
    });
  }, []);

  // ── Hours change — clamp to minimum ────────────────────────────────────────
  const handleHoursChange = useCallback((v: number) => {
    setWeeklyHours(Math.max(2, v));
  }, []);

  // ── Book handler — seeds office store then navigates ───────────────────────
  const handleBook = useCallback(async () => {
    if (!pricing) return;

    const { useOfficeBookingStore } =
      await import("@/app/store/useOfficeBookingStore");

    // setState directly — saveDetails() would advance the step counter
    useOfficeBookingStore.setState({
      details: {
        officeName: "",
        workspaceType: "open_plan",
        officeSizeSqm: selectedSpace?.squareMeters ?? 75,
        staffCount: 0,
      },
      schedule: {
        weeklyHours,
        recurringRules: [],
        eveningWeekendSurcharge: hasSurcharge,
        frequency: "weekly",
      },
      pricing,
      currentStep: "details",
      submissionError: null,
      confirmedBookingId: null,
    });

    router.push(`/${locale}/pricing/office-cleaning-booking`);
  }, [pricing, weeklyHours, hasSurcharge, selectedSpace, locale, router]);

  return {
    // Header
    stateLocale,
    toggleLocale,
    // Calculator inputs
    weeklyHours,
    selectedSpace,
    schedule,
    hasSurcharge,
    selectedAddons,
    addonsTotal,
    // Derived
    pricing,
    // Handlers
    handleHoursChange,
    setSelectedSpace,
    setSchedule,
    setHasSurcharge,
    toggleAddon,
    handleBook,
  };
}
