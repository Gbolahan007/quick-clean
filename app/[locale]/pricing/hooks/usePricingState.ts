// hooks/usePricingState.ts
"use client";

import { usePricingSelectors } from "./usePricingStore";

/**
 * DROP-IN REPLACEMENT for the old usePricingState hook.
 *
 * The API is identical to the original — components that consume it
 * need zero changes. We just delegate to the Zustand store internally.
 */

type Locale = "en" | "fi";

// The `initialLocale` param is kept for API compatibility but is only
// used on the very first load (before anything is persisted).
export function usePricingState(_initialLocale: Locale = "en") {
  return usePricingSelectors();
}
