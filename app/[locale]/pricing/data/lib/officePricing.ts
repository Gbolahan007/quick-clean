import {
  OFFICE_PRICING_TIERS,
  WEEKS_PER_MONTH,
  EVENING_WEEKEND_SURCHARGE_PCT,
  type OfficePricingTier,
  type OfficePricingResult,
  type OfficePricingTierDefinition,
} from "../../../../types/office";

// ── Tier resolution ───────────────────────────────────────────────────────────

export function resolveTier(weeklyHours: number): OfficePricingTierDefinition {
  const tier = OFFICE_PRICING_TIERS.find(
    (t) =>
      weeklyHours >= t.minHours &&
      (t.maxHours === null || weeklyHours <= t.maxHours),
  );

  if (!tier) {
    // Fallback to Tier 3 for anything above 21h
    return OFFICE_PRICING_TIERS[2];
  }

  return tier;
}

// ── Main pricing calculator ───────────────────────────────────────────────────

export function calculateOfficePricing(
  weeklyHours: number,
  hasSurcharge: boolean,
): OfficePricingResult {
  if (weeklyHours < 2) {
    throw new Error("Minimum weekly hours is 2 for office cleaning contracts.");
  }

  const tier = resolveTier(weeklyHours);
  const weeklyCost = Math.round(weeklyHours * tier.hourlyRate * 100) / 100;
  const monthlyCost = Math.round(weeklyCost * WEEKS_PER_MONTH * 100) / 100;

  const surchargeAmount = hasSurcharge
    ? Math.round(monthlyCost * EVENING_WEEKEND_SURCHARGE_PCT * 100) / 100
    : 0;

  const finalMonthly = Math.round((monthlyCost + surchargeAmount) * 100) / 100;

  return {
    tier: tier.key as OfficePricingTier,
    hourlyRate: tier.hourlyRate,
    hourlyExVat: tier.hourlyExVat,
    weeklyHours,
    weeklyCost,
    monthlyCost,
    surchargeAmount,
    finalMonthly,
    hasSurcharge,
  };
}

// ── Schedule hours validator ──────────────────────────────────────────────────
// Validates that the sum of duration_hours across recurring rules
// matches the declared weekly_hours.

export function validateScheduleHours(
  weeklyHours: number,
  rules: { durationHours: number }[],
): { valid: boolean; scheduledHours: number; message?: string } {
  const scheduledHours = rules.reduce((sum, r) => sum + r.durationHours, 0);
  const diff = Math.abs(scheduledHours - weeklyHours);

  if (diff > 0.5) {
    return {
      valid: false,
      scheduledHours,
      message: `Schedule totals ${scheduledHours}h but contract is for ${weeklyHours}h/week. Please adjust.`,
    };
  }

  return { valid: true, scheduledHours };
}

// ── Human-readable tier label ─────────────────────────────────────────────────

export function getTierLabel(tier: OfficePricingTier): string {
  const def = OFFICE_PRICING_TIERS.find((t) => t.key === tier);
  return def?.label ?? tier;
}

// ── Day-of-week helper ────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

// ── Stripe amount helper ──────────────────────────────────────────────────────
// Stripe expects amounts in smallest currency unit (cents for EUR).

export function toStripeCents(euros: number): number {
  return Math.round(euros * 100);
}
