"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { APARTMENT_TYPES, type ApartmentType } from "../data/apartmentType";
import { OFFICE_SPACE_TYPES } from "../data/officeSpaceTypes";
import { getPrice } from "../data/pricing";
import type { Plan } from "@/app/types/booking";

type ServiceType = "maintenance" | "deep" | "moveout" | "office";

interface PricingTableProps {
  plans: Record<string, Plan>;
  selectedPlan: string | null;
  selectedApt: ApartmentType | null;
  showDeducted: boolean;
  serviceType: ServiceType;
  onSelectApt: (apt: ApartmentType) => void;
}

interface ColHeadProps {
  children: React.ReactNode;
  align: "left" | "right" | "center";
  px: number;
}

export function PricingTable({
  plans,
  selectedPlan,
  selectedApt,
  showDeducted,
  serviceType,
  onSelectApt,
}: PricingTableProps) {
  const t = useTranslations("pricing");

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!selectedApt || !selectedPlan) return null;

  const plan = plans[selectedPlan];
  if (!plan) return null;

  // ── Config ──────────────────────────────────────────────────────────────────
  const isOffice = serviceType === "office";
  const isMaintenance = serviceType === "maintenance";

  const rowTypes: ApartmentType[] = isOffice
    ? OFFICE_SPACE_TYPES
    : APARTMENT_TYPES;

  const showCleaners = Boolean(plan.cleaners);
  const showVisits = isMaintenance && Boolean(plan.visits);

  const priceHeader =
    plan.priceType === "monthly" ? t("pricePerMonth") : t("pricePerVisit");

  const planLabel = t(`plans.${plan.labelKey}`);
  const aptLabel = t(`apartments.${selectedApt.labelKey}`);

  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          border: "1.5px solid #e5e7eb",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* ── Table header bar ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: "18px 22px",
            background: "#f0f5f2",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#0a1628",
            }}
          >
            {planLabel} — {aptLabel}
          </h3>
          <span style={{ fontSize: 13, color: "rgba(10,22,40,0.5)" }}>
            {selectedApt.size}
          </span>
        </div>

        {/* ── Scrollable table ─────────────────────────────────────────────── */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {/* Column header label adapts: "Apartment type" vs "Office size" */}
                <ColHead align="left" px={20}>
                  {isOffice ? t("office.chooseSpace") : t("apartmentType")}
                </ColHead>
                <ColHead align="left" px={12}>
                  {t("size")}
                </ColHead>
                <ColHead align="left" px={12}>
                  {t("duration")}
                </ColHead>
                {showCleaners && (
                  <ColHead align="left" px={12}>
                    {t("cleaners")}
                  </ColHead>
                )}
                {showVisits && (
                  <ColHead align="left" px={12}>
                    {t("visitsPerMonth")}
                  </ColHead>
                )}
                <ColHead align="right" px={20}>
                  {priceHeader}
                </ColHead>
              </tr>
            </thead>

            <tbody>
              {rowTypes.map((apt, i) => {
                const price = getPrice(plan, i, showDeducted);
                const isCurrent = apt.key === selectedApt.key;
                const rowBg = isCurrent
                  ? "#f0f8f3"
                  : i % 2 === 0
                    ? "#fff"
                    : "#fafafa";

                return (
                  <tr
                    key={apt.key}
                    onClick={() => onSelectApt(apt)}
                    style={{
                      background: rowBg,
                      borderBottom: "1px solid #f5f5f5",
                      cursor: "pointer",
                    }}
                  >
                    <td
                      style={{
                        padding: "13px 20px",
                        fontWeight: 700,
                        color: isCurrent ? "#3d6b47" : "#7c9885",
                      }}
                    >
                      {isCurrent && <span style={{ marginRight: 6 }}>▶</span>}
                      {t(`apartments.${apt.labelKey}`)}
                    </td>

                    <td style={mutedCell}>{apt.size}</td>
                    <td style={mutedCell}>{plan.durations[i]}</td>

                    {showCleaners && plan.cleaners && (
                      <td style={mutedCell}>
                        {plan.cleaners[i] === "2" && (
                          <span style={twoCleanerBadge}>×2</span>
                        )}
                        {plan.cleaners[i]}
                      </td>
                    )}

                    {showVisits && <td style={mutedCell}>{plan.visits}</td>}

                    <td
                      style={{
                        padding: "13px 20px",
                        textAlign: "right",
                        fontWeight: 800,
                        fontSize: 16,
                        color: "#0a1628",
                      }}
                    >
                      {price !== null ? `€${price}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footnote — hidden for office (sauna note isn't relevant) */}
      {!isOffice && (
        <p
          style={{ fontSize: 12, color: "rgba(10,22,40,0.35)", marginTop: 10 }}
        >
          {t("saunaAddonNote")}
        </p>
      )}
    </div>
  );
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function ColHead({ children, align, px }: ColHeadProps) {
  return (
    <th
      style={{
        textAlign: align,
        padding: `10px ${px}px`,
        fontWeight: 700,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "rgba(10,22,40,0.55)",
      }}
    >
      {children}
    </th>
  );
}

const mutedCell: React.CSSProperties = {
  padding: "13px 12px",
  color: "rgba(10,22,40,0.55)",
  whiteSpace: "nowrap",
};

const twoCleanerBadge: React.CSSProperties = {
  fontSize: 10,
  background: "rgba(124,152,133,0.12)",
  color: "#7c9885",
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: 4,
  marginRight: 4,
};
