"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { calcAddonTotals } from "../data/pricing";

type QtyMap = Record<string, number>;

type AddonSummary = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
};

type OnChange = (summary: AddonSummary) => void;

/**
 * useAddonState
 */
export function useAddonState(showDeducted: boolean, onChange?: OnChange) {
  const [qtyMap, setQtyMap] = useState<QtyMap>({});

  /**
   * Recompute totals whenever qtyMap or pricing mode changes
   */
  const summary = useMemo<AddonSummary>(() => {
    return {
      ...calcAddonTotals(qtyMap, showDeducted),
      qtyMap,
    };
  }, [qtyMap, showDeducted]);

  /**
   * Notify parent when totals change
   */
  useEffect(() => {
    onChange?.(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  /**
   * Toggle checkbox addons OR cycle stepper addons
   */
  const toggle = useCallback((key: string, perLoad: boolean): void => {
    setQtyMap((prev) => {
      if (perLoad) {
        // 0 → 1 → 2 ... 5 → 0
        const current = prev[key] ?? 0;

        return {
          ...prev,
          [key]: current < 5 ? current + 1 : 0,
        };
      }

      // checkbox: off ↔ on
      return {
        ...prev,
        [key]: prev[key] ? 0 : 1,
      };
    });
  }, []);

  const decrement = useCallback((key: string): void => {
    setQtyMap((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 1) - 1),
    }));
  }, []);

  const increment = useCallback((key: string): void => {
    setQtyMap((prev) => ({
      ...prev,
      [key]: (prev[key] ?? 0) + 1,
    }));
  }, []);

  return {
    qtyMap,
    toggle,
    decrement,
    increment,
    summary,
  };
}
