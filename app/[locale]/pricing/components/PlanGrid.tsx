"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { getPrice } from "../data/pricing";
import { Badge, SectionLabel } from "./ui/Badge";

// --- Types ---

export // In PlanGrid.tsx (or a shared types file)
interface Plan {
  key: string;
  labelKey: string;
  badge: string | null;
  discountKey: string | null; // was optional, but data has explicit null
  visitInfoKey: string | null; // same
  priceType: string;
  prices: number[];
  deducted: number[];
  durations: string[];
  cleaners?: (string | number)[];

  // maintenance-only
  visits?: number | null;

  // deep-only
  visitsCount?: number | null;
  visitsPerYear?: number | null;
}

interface PlanCardProps {
  plan: Plan;
  aptIdx: number | null;
  showDeducted: boolean;
  isSelected: boolean;
  onSelect: (planKey: string) => void;
  serviceType: ServiceType;
}
interface PlanGridProps {
  plans: Record<string, Plan>;
  aptIdx: number | null;
  showDeducted: boolean;
  selectedPlan: string;
  onSelectPlan: (key: string) => void;
  serviceType: ServiceType;
}

type ServiceType = "maintenance" | "deep";

// --- Chip Component ---

interface ChipProps {
  children: React.ReactNode;
  amber?: boolean;
}

function Chip({ children, amber = false }: ChipProps) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
        background: amber ? "#f9f0e0" : "#f0f5f2",
        color: amber ? "#92600a" : "#4a6b52",
      }}
    >
      {children}
    </span>
  );
}

// --- PlanCard Component ---

function PlanCard({
  plan,
  aptIdx,
  showDeducted,
  isSelected,
  onSelect,
}: PlanCardProps) {
  const t = useTranslations("pricing");

  const isPopular = plan.badge === "popular";
  const isRecommended = plan.badge === "recommended";
  const isHighlighted = isPopular || isRecommended;

  // Header colour
  const headerBg = isPopular
    ? "#0a1628"
    : isRecommended
      ? "#7c9885"
      : "#f0f5f2";
  const headerColor = isHighlighted ? "#fff" : "#0a1628";

  // Price + meta
  const price = getPrice(plan, aptIdx, showDeducted);
  const duration = aptIdx !== null ? plan.durations[aptIdx] : null;
  const cleaners = aptIdx !== null ? plan.cleaners?.[aptIdx] : null;

  // Price suffix logic
  let priceNote = "";
  if (plan.priceType === "monthly") {
    priceNote = t("perMonth");
  } else if (plan.visitsPerYear) {
    priceNote = t("perVisitPerYear");
  } else {
    priceNote = t("perVisit");
  }

  const visitInfo = plan.visitInfoKey
    ? t(`visitInfo.${plan.visitInfoKey}`)
    : null;

  const discountLabel = plan.discountKey ? `— ${t(plan.discountKey)}` : null;

  return (
    <div
      onClick={() => onSelect(plan.key)}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: isSelected ? "2.5px solid #7c9885" : "1.5px solid #e5e7eb",
        boxShadow: isSelected
          ? "0 0 0 4px rgba(124,152,133,0.15)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer",
        transition: "all 0.18s",
        background: "#fff",
        position: "relative",
      }}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "#7c9885",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
            ✓
          </span>
        </div>
      )}

      <div
        style={{
          padding: "14px 18px",
          background: headerBg,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: headerColor }}>
          {t(`plans.${plan.labelKey}`)}
        </span>

        {isPopular && <Badge label={t("mostPopular")} variant="popular" />}
        {isRecommended && (
          <Badge label={t("recommended")} variant="recommended" />
        )}

        {discountLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isRecommended ? "rgba(255,255,255,0.8)" : "#7c9885",
              marginLeft: "auto",
            }}
          >
            {discountLabel}
          </span>
        )}

        {visitInfo && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: isHighlighted
                ? "rgba(255,255,255,0.7)"
                : "rgba(10,22,40,0.45)",
            }}
          >
            {visitInfo}
          </span>
        )}
      </div>

      <div style={{ padding: "18px 18px 16px" }}>
        {price !== null ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#0a1628",
                  letterSpacing: "-1px",
                }}
              >
                €{price}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(10,22,40,0.5)",
                  fontWeight: 500,
                }}
              >
                {priceNote}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {duration && <Chip>⏱ {duration}</Chip>}
              {cleaners && (
                <Chip>
                  {cleaners === "2" ? "👥" : "👤"} {cleaners}{" "}
                  {t(
                    cleaners !== "1" && cleaners !== "1 or 2"
                      ? "cleanersPlural"
                      : "cleanersSingular",
                  )}
                </Chip>
              )}
              {plan.visitsPerYear && <Chip amber>📅 4× / year</Chip>}
            </div>
          </>
        ) : (
          <p
            style={{
              fontSize: 13,
              color: "rgba(10,22,40,0.45)",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            {t("noApt")}
          </p>
        )}
      </div>
    </div>
  );
}

// --- PlanGrid Component ---

export function PlanGrid({
  plans,
  aptIdx,
  showDeducted,
  selectedPlan,
  onSelectPlan,
  serviceType,
}: PlanGridProps) {
  const t = useTranslations("pricing");

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionLabel>{t("choosePlan")}</SectionLabel>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {Object.values(plans).map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            aptIdx={aptIdx}
            showDeducted={showDeducted}
            isSelected={selectedPlan === plan.key}
            onSelect={onSelectPlan}
            serviceType={serviceType}
          />
        ))}
      </div>
    </div>
  );
}
