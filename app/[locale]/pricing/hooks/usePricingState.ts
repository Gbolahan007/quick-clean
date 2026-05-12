// hooks/usePricingState.ts
"use client";

import { usePricingSelectors } from "./usePricingStore";

type Locale = "en" | "fi";

export function usePricingState(_initialLocale: Locale = "en") {
  return usePricingSelectors();
}
