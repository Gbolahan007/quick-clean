export const TIER_CONFIG = [
  {
    key: "tier1" as const,
    rate: 49,
    exVat: 39.04,
    color: "#7c9885",
    bg: "#f0f8f3",
    border: "#c8dcd0",
  },
  {
    key: "tier2" as const,
    rate: 44,
    exVat: 35.06,
    color: "#4a7c6b",
    bg: "#e8f4ef",
    border: "#a8ccbc",
  },
  {
    key: "tier3" as const,
    rate: 40,
    exVat: 31.87,
    color: "#2d6b5a",
    bg: "#dceee8",
    border: "#88bfac",
  },
] as const;

export type TierKey = (typeof TIER_CONFIG)[number]["key"];
export type TierCfg = (typeof TIER_CONFIG)[number];

export function getTierCfg(key: TierKey | string): TierCfg {
  return TIER_CONFIG.find((t) => t.key === key) ?? TIER_CONFIG[0];
}

// label is NOT here — use t(`pricing.office.addons.${key}.label`) in components.
export const OFFICE_ADDONS = [
  { key: "window_cleaning" as const, monthlyEst: 80 },
  { key: "carpet_cleaning" as const, monthlyEst: 120 },
  { key: "post_event" as const, monthlyEst: 0 },
  { key: "supply_restocking" as const, monthlyEst: 60 },
] as const;

export type OfficeAddonKey = (typeof OFFICE_ADDONS)[number]["key"];

// label is NOT here — use t(`pricing.office.schedule${Key}`) in components.
export const SCHEDULE_PRESETS = [
  { distribKey: "daily" as const },
  { distribKey: "3days" as const },
  { distribKey: "2days" as const },
  { distribKey: "custom" as const },
] as const;

export type ScheduleKey = (typeof SCHEDULE_PRESETS)[number]["distribKey"];

// INCLUDED_SCOPE, CONTRACT_NOTES, and TRUST_BADGES have been removed.
// Use t.raw("pricing.office.scopeIncluded"), t.raw("pricing.office.contractNotes"),
// and t.raw("pricing.office.trust") in components instead.
