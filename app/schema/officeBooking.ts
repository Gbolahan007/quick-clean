import { z } from "zod";

const WORKSPACE_TYPES = [
  "open_plan",
  "private_offices",
  "coworking",
  "mixed",
  "warehouse",
] as const;
const OFFICE_ADDON_KEYS = [
  "window_cleaning",
  "carpet_cleaning",
  "post_event",
  "supply_restocking",
] as const;
const PRICING_TIERS = ["tier1", "tier2", "tier3"] as const;
const FREQUENCIES = ["one-time", "weekly", "biweekly", "monthly"] as const;

// ── Step 1: Office details ────────────────────────────────────────────────────

export const officeDetailsSchema = z.object({
  officeName: z.string().min(1, "Office name is required").max(100),
  workspaceType: z.enum(WORKSPACE_TYPES, {
    error: "Please select a workspace type",
  }),
  officeSizeSqm: z
    .number()
    .int()
    .positive("Office size must be a positive number"),
  staffCount: z.number().int().nonnegative("Staff count must be 0 or more"),
});

export type OfficeDetailsSchema = z.infer<typeof officeDetailsSchema>;

// ── Schedule rule ─────────────────────────────────────────────────────────────

export const scheduleRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  durationHours: z.number().positive().max(12, "Maximum 12 hours per day"),
});

// ── Step 2: Office schedule ───────────────────────────────────────────────────

export const officeScheduleSchema = z.object({
  weeklyHours: z
    .number()
    .min(2, "Minimum 2 hours/week")
    .max(60, "Maximum 60 hours/week"),
  recurringRules: z
    .array(scheduleRuleSchema)
    .min(1, "At least one recurring day is required")
    .max(7),
  eveningWeekendSurcharge: z.boolean(),
  frequency: z.enum(FREQUENCIES),
});

export type OfficeScheduleSchema = z.infer<typeof officeScheduleSchema>;

// ── Step 3: Addons ────────────────────────────────────────────────────────────

export const officeAddonsSchema = z.object({
  selected: z.array(z.enum(OFFICE_ADDON_KEYS)),
  addonsMonthlyTotal: z.number().nonnegative(),
});

export type OfficeAddonsSchema = z.infer<typeof officeAddonsSchema>;

// ── Full submit payload ───────────────────────────────────────────────────────

export const officeBookingSubmitSchema = z.object({
  // Customer
  firstName: z.string().min(2),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),

  // Address
  streetAddress: z.string().min(1),
  apartmentNumber: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  accessInstructions: z.string().optional(),
  squareMeters: z.number().int().positive(),
  numberOfRooms: z.number().int().positive(),

  // Office details
  officeName: z.string().min(1),
  workspaceType: z.enum(WORKSPACE_TYPES),
  officeSizeSqm: z.number().int().positive(),
  staffCount: z.number().int().nonnegative(),

  // Schedule
  weeklyHours: z.number().min(2).max(60),
  recurringRules: z.array(scheduleRuleSchema).min(1).max(7),
  eveningWeekendSurcharge: z.boolean(),
  frequency: z.enum(FREQUENCIES),

  // Pricing inputs (server recalculates — client values are hints only)
  weeklyHoursInput: z.number().min(2),
  pricingTier: z.enum(PRICING_TIERS),
  hourlyRate: z.number().positive(),
  monthlyEstimate: z.number().positive(),

  // Addons
  selectedAddons: z.array(z.enum(OFFICE_ADDON_KEYS)),
  addonsMonthlyTotal: z.number().nonnegative(),

  // Notes
  specialNotes: z.string(),

  // Service snapshot
  serviceType: z.literal("office"),
  planKey: z.string().min(1),
  planLabel: z.string().min(1),
  finalPrice: z.number().positive(),
  basePrice: z.number().positive(),

  locale: z.enum(["en", "fi"]).optional(),
});

export type OfficeBookingSubmitSchema = z.infer<
  typeof officeBookingSubmitSchema
>;
