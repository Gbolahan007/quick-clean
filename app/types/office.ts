import type { BookingFrequency } from "./booking";

// ── Pricing engine ────────────────────────────────────────────────────────────

export type OfficePricingTier = "tier1" | "tier2" | "tier3";

export type WorkspaceType =
  | "open_plan"
  | "private_offices"
  | "coworking"
  | "mixed"
  | "warehouse";

export interface OfficePricingTierDefinition {
  key: OfficePricingTier;
  label: string; // "Tier 1 — Light"
  minHours: number; // 2
  maxHours: number | null; // null = no upper limit (Tier 3)
  hourlyRate: number; // incl. VAT
  hourlyExVat: number;
  marginPct: number;
}

export const OFFICE_PRICING_TIERS: OfficePricingTierDefinition[] = [
  {
    key: "tier1",
    label: "Tier 1 — Light",
    minHours: 2,
    maxHours: 10,
    hourlyRate: 49,
    hourlyExVat: 39.04,
    marginPct: 36,
  },
  {
    key: "tier2",
    label: "Tier 2 — Regular",
    minHours: 11,
    maxHours: 20,
    hourlyRate: 44,
    hourlyExVat: 35.06,
    marginPct: 29,
  },
  {
    key: "tier3",
    label: "Tier 3 — Intensive",
    minHours: 21,
    maxHours: null,
    hourlyRate: 40,
    hourlyExVat: 31.87,
    marginPct: 22,
  },
];

export const WEEKS_PER_MONTH = 4.2;
export const EVENING_WEEKEND_SURCHARGE_PCT = 0.15;

// ── Pricing calculation result ────────────────────────────────────────────────

export interface OfficePricingResult {
  tier: OfficePricingTier;
  hourlyRate: number; // incl. VAT
  hourlyExVat: number;
  weeklyHours: number;
  weeklyCost: number; // weeklyHours × hourlyRate
  monthlyCost: number; // weeklyCost × 4.33
  surchargeAmount: number; // 0 or +15% applied to monthlyCost
  finalMonthly: number; // monthlyCost + surchargeAmount
  hasSurcharge: boolean;
}

// ── Step 1: Office details ────────────────────────────────────────────────────

export interface OfficeDetailsInfo {
  officeName: string;
  workspaceType: WorkspaceType;
  officeSizeSqm: number;
  staffCount: number;
}

// ── Step 2: Office schedule ───────────────────────────────────────────────────

export interface OfficeScheduleRule {
  dayOfWeek: number; // 0–6 (JS convention: 0=Sunday)
  startTime: string; // "08:00"
  durationHours: number; // e.g. 2.5
}

export interface OfficeScheduleInfo {
  weeklyHours: number;
  recurringRules: OfficeScheduleRule[];
  eveningWeekendSurcharge: boolean;
  frequency: BookingFrequency; // always 'weekly' for recurring office
}

// ── Step 3: Office addons ─────────────────────────────────────────────────────

export type OfficeAddonKey =
  | "window_cleaning"
  | "carpet_cleaning"
  | "post_event"
  | "supply_restocking";

export interface OfficeAddonOption {
  key: OfficeAddonKey;
  labelKey: string;
  pricePerVisit: number;
  isSelected: boolean;
}

export interface OfficeAddonsInfo {
  selected: OfficeAddonKey[];
  addonsMonthlyTotal: number;
}

// ── Full office booking state ─────────────────────────────────────────────────

export interface OfficeBookingState {
  // Step data
  details: Partial<OfficeDetailsInfo>;
  schedule: Partial<OfficeScheduleInfo>;
  addons: OfficeAddonsInfo;
  pricing: OfficePricingResult | null;

  // Contact + address reuse existing BookingState fields
  // (see useOfficeBookingStore which extends useBookingStore pattern)

  // Submission state
  isSubmitting: boolean;
  submissionError: string | null;
  confirmedBookingId: string | null;
}

export type OfficeBookingStep =
  | "details"
  | "schedule"
  | "addons"
  | "contact"
  | "address"
  | "review";

export const OFFICE_BOOKING_STEPS: OfficeBookingStep[] = [
  "details",
  "schedule",
  "addons",
  "contact",
  "address",
  "review",
];

// ── Server action payload ─────────────────────────────────────────────────────

export interface OfficeBookingSubmitPayload {
  // ── Customer (reuse existing) ─────────────────────────────────────────────
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // ── Address (reuse existing) ──────────────────────────────────────────────
  streetAddress: string;
  apartmentNumber?: string;
  city: string;
  postalCode: string;
  accessInstructions?: string;
  // Office addresses don't use squareMeters/numberOfRooms from apartment data
  // — they use office_size_sqm and staff_count instead
  squareMeters: number; // = officeSizeSqm (reuses addresses column)
  numberOfRooms: number; // = estimated rooms, set to 1 for offices

  // ── Office details ────────────────────────────────────────────────────────
  officeName: string;
  workspaceType: WorkspaceType;
  officeSizeSqm: number;
  staffCount: number;

  // ── Schedule ──────────────────────────────────────────────────────────────
  weeklyHours: number;
  recurringRules: OfficeScheduleRule[];
  eveningWeekendSurcharge: boolean;
  frequency: BookingFrequency;

  // ── Pricing (calculated server-side, frontend sends inputs) ───────────────
  weeklyHoursInput: number; // used for server-side recalculation
  pricingTier: OfficePricingTier;
  hourlyRate: number; // client hint — server validates
  monthlyEstimate: number; // client hint — server recalculates

  // ── Addons ────────────────────────────────────────────────────────────────
  selectedAddons: OfficeAddonKey[];
  addonsMonthlyTotal: number;

  // ── Notes ─────────────────────────────────────────────────────────────────
  specialNotes: string;

  // ── Service snapshot ──────────────────────────────────────────────────────
  serviceType: "office";
  planKey: string; // "office-tier1" | "office-tier2" | "office-tier3" | "office-deep"
  planLabel: string;
  finalPrice: number; // = monthlyEstimate (recurring) or one-time amount
  basePrice: number; // = weeklyHours × hourlyRate × 4.33
}

// ── Server action response ────────────────────────────────────────────────────

export type OfficeBookingResult =
  | {
      success: true;
      bookingId: string;
      customerId: string;
      stripeSessionUrl?: string;
    }
  | { success: false; error: string; code?: string };
