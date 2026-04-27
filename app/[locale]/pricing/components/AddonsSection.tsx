"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAddonState } from "../hooks/useAddonState";
import { ADDONS } from "../data/addOns";

export type QtyMap = Record<string, number>;

export type AddonsSummary = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
};

export interface Addon {
  key: string;
  labelKey: string;
  noteKey?: string;
  price: number;
  deducted: number;
  perLoad?: boolean;
  prominent?: boolean;
}
interface AddonsSectionProps {
  showDeducted: boolean;
  aptIdx: number | null;
  onChange: (summary: AddonsSummary) => void;
}

export function AddonsSection({
  showDeducted,
  aptIdx,
  onChange,
}: AddonsSectionProps) {
  const t = useTranslations("pricing");

  // Assuming useAddonState is already typed or returns these shapes
  const { qtyMap, toggle, decrement, increment, summary } = useAddonState(
    showDeducted,
    onChange,
  );

  const { selectedCount, rawTotal, discount, discountedTotal } = summary;

  return (
    <div>
      <p
        style={{ fontSize: 13, color: "rgba(10,22,40,0.55)", marginBottom: 16 }}
      >
        {t("addonsNote")}
      </p>

      {selectedCount >= 2 && (
        <div
          style={{
            background: "#edf7f0",
            border: "1px solid rgba(124,152,133,0.35)",
            borderRadius: 12,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <span style={{ color: "#7c9885", fontSize: 16 }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#3d6b47" }}>
            {t("discount10")}
          </span>
        </div>
      )}

      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1.5px solid #e5e7eb",
        }}
      >
        {ADDONS.map((addon, i) => {
          const qty = qtyMap[addon.key] ?? 0;
          const isOn = qty > 0;
          const price = showDeducted ? addon.deducted : addon.price;
          const showRecommend =
            addon.prominent && aptIdx !== null && aptIdx >= 2;
          const rowBg = isOn ? "#f0f8f3" : i % 2 === 0 ? "#fff" : "#fafafa";

          return (
            <div
              key={addon.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                background: rowBg,
                borderBottom:
                  i < ADDONS.length - 1 ? "1px solid #f0f0f0" : "none",
                transition: "background 0.15s",
              }}
            >
              <button
                type="button"
                onClick={() => toggle(addon.key, !!addon.perLoad)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${isOn ? "#7c9885" : "#ccc"}`,
                  background: isOn ? "#7c9885" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {isOn && (
                  <span
                    style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}
                  >
                    ✓
                  </span>
                )}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: isOn ? "#3d6b47" : "#0a1628",
                    }}
                  >
                    {t(`addons.${addon.labelKey}.label`)}
                  </p>

                  {showRecommend && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "rgba(124,152,133,0.12)",
                        color: "#4a6b52",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      ★ {t("recommendedShort")}
                    </span>
                  )}
                </div>

                {addon.noteKey && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(10,22,40,0.5)",
                    }}
                  >
                    {t(`addons.${addon.noteKey}.note`)}
                  </p>
                )}

                {addon.prominent && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(124,152,133,0.7)",
                    }}
                  >
                    {t("saunaNote")}
                  </p>
                )}
              </div>

              {addon.perLoad && isOn && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StepBtn onClick={() => decrement(addon.key)}>−</StepBtn>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0a1628",
                      minWidth: 16,
                      textAlign: "center",
                    }}
                  >
                    {qty}
                  </span>
                  <StepBtn onClick={() => increment(addon.key)}>+</StepBtn>
                  <span style={{ fontSize: 11, color: "rgba(10,22,40,0.45)" }}>
                    {t("loads")}
                  </span>
                </div>
              )}

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}
                >
                  €{price}
                </span>
                {addon.perLoad && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(10,22,40,0.45)",
                      display: "block",
                    }}
                  >
                    {t("perLoad")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div
          style={{
            marginTop: 16,
            background: "#0a1628",
            borderRadius: 14,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
            {selectedCount} {t("addonsSelected")}
          </span>

          <div style={{ textAlign: "right" }}>
            {discount > 0 && (
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  textDecoration: "line-through",
                }}
              >
                {t("originalTotal")}: €{rawTotal}
              </p>
            )}
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {t("discountedTotal")}: €{discountedTotal}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepBtnProps {
  onClick: () => void;
  children: React.ReactNode;
}

function StepBtn({ onClick, children }: StepBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        border: "1px solid #ccc",
        background: "#fff",
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}
