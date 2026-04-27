"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { aptIndex, getPrice } from "../data/pricing";

export interface ApartmentType {
  key: string;
  labelKey: string;
  size: string;
  emoji: string;
}

export interface Plan {
  key: string;
  labelKey: string;
  prices: number[];
  deducted: number[];
  // ... other properties
}

export type QtyMap = Record<string, number>;

export interface AddonsSummary {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
}

interface SummaryBarProps {
  serviceType: "maintenance" | "deep";
  apt: ApartmentType | null;
  planKey: string | null;
  plans: Record<string, Plan>;
  showDeducted: boolean;
  addonsSummary: AddonsSummary;
  onBook: () => void;
}

export function SummaryBar({
  apt,
  planKey,
  plans,
  showDeducted,
  addonsSummary,
  onBook,
}: SummaryBarProps) {
  const t = useTranslations("pricing");

  // Don't render until the user has made both selections
  if (!apt || !planKey) return null;

  const plan = plans[planKey];

  // Calculate Base Price safely
  const idx = aptIndex(apt.key);
  const basePrice = plan ? (getPrice(plan, idx, showDeducted) ?? 0) : 0;
  const total = basePrice + (addonsSummary?.discountedTotal ?? 0);

  const aptLabel = t(`apartments.${apt.labelKey}`);
  const planLabel = plan ? t(`plans.${plan.labelKey}`) : "—";
  const addonCount = addonsSummary?.selectedCount ?? 0;

  const addonSuffix =
    addonCount > 0 ? ` + ${addonCount} ${t("addonsSelected")}` : "";

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 20,
        background: "#fff",
        borderTop: "1.5px solid #e5e7eb",
        boxShadow: "0 -4px 24px rgba(10,22,40,0.07)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <p
          style={{
            margin: "0 0 2px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(10,22,40,0.45)",
          }}
        >
          {t("summary")}
        </p>
        <p
          style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0a1628" }}
        >
          {aptLabel} · {planLabel}
          {addonSuffix}
        </p>
      </div>

      <div style={{ textAlign: "right" }}>
        <p
          style={{
            margin: "0 0 1px",
            fontSize: 11,
            color: "rgba(10,22,40,0.45)",
          }}
        >
          {t("livePrice")}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#0a1628",
            letterSpacing: "-0.5px",
          }}
        >
          €{total}
        </p>
      </div>

      <button
        type="button"
        onClick={onBook}
        style={{
          background: "#7c9885",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "12px 28px",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(124,152,133,0.4)",
          transition: "all 0.18s",
          whiteSpace: "nowrap",
        }}
      >
        {t("bookNow")} →
      </button>
    </div>
  );
}
