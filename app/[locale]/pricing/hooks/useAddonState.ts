"use client";

import { useMemo, useEffect, useCallback } from "react";
import { calcAddonTotals } from "../data/pricing";
import { usePricingStore } from "./usePricingStore";

type QtyMap = Record<string, number>;

type AddonSummary = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
};

type OnChange = (summary: AddonSummary) => void;

export function useAddonState(showDeducted: boolean, onChange?: OnChange) {
  const addonQtyMap = usePricingStore((s) => s.addonQtyMap);
  const setAddonQtyMap = usePricingStore((s) => s.setAddonQtyMap);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const summary = useMemo<AddonSummary>(
    () => ({
      ...calcAddonTotals(addonQtyMap, showDeducted),
      qtyMap: addonQtyMap,
    }),
    [addonQtyMap, showDeducted],
  );

  useEffect(() => {
    onChange?.(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // ── Mutators ────────────────────────────────────────────────────────────────

  const toggle = useCallback(
    (key: string, perLoad: boolean): void => {
      setAddonQtyMap(
        (() => {
          const prev = usePricingStore.getState().addonQtyMap;
          if (perLoad) {
            const current = prev[key] ?? 0;
            return { ...prev, [key]: current < 5 ? current + 1 : 0 };
          }
          return { ...prev, [key]: prev[key] ? 0 : 1 };
        })(),
      );
    },
    [setAddonQtyMap],
  );

  const decrement = useCallback(
    (key: string): void => {
      const prev = usePricingStore.getState().addonQtyMap;
      setAddonQtyMap({ ...prev, [key]: Math.max(0, (prev[key] ?? 1) - 1) });
    },
    [setAddonQtyMap],
  );

  const increment = useCallback(
    (key: string): void => {
      const prev = usePricingStore.getState().addonQtyMap;
      setAddonQtyMap({ ...prev, [key]: (prev[key] ?? 0) + 1 });
    },
    [setAddonQtyMap],
  );

  return { qtyMap: addonQtyMap, toggle, decrement, increment, summary };
}
