import { Plan } from "@/app/types/pricing";

// ─── Maintenance plans ────────────────────────────────────────────────────────

export const MAINTENANCE_PLANS = {
  weekly: {
    key: "weekly",
    labelKey: "weekly",
    badge: null,
    discountKey: null,
    visitInfoKey: "weeklyVisits", // "4× / month"
    visits: 4,
    prices: [284, 380, 564, 756],
    deducted: [185, 247, 367, 491],
    durations: ["1.5h", "2.0h", "3.0h", "4.0h"],
    cleaners: ["1", "1", "1", "1"],
    priceType: "monthly",
  },

  biweekly: {
    key: "biweekly",
    labelKey: "biweekly",
    badge: "popular", // pre-selected default
    discountKey: null,
    visitInfoKey: "biweeklyVisits", // "2× / month"
    visits: 2,
    prices: [158, 210, 316, 420],
    deducted: [103, 137, 205, 273],
    durations: ["1.5h", "2.0h", "3.0h", "4.0h"],
    cleaners: ["1", "1", "1", "1"],
    priceType: "monthly",
  },

  monthly: {
    key: "monthly",
    labelKey: "monthly",
    badge: null,
    discountKey: null,
    visitInfoKey: "monthlyVisits", // "1× / month"
    visits: 1,
    prices: [87, 116, 174, 231],
    deducted: [57, 75, 113, 150],
    durations: ["1.5h", "2.0h", "3.0h", "4.0h"],
    cleaners: ["1", "1", "1", "1"],
    priceType: "monthly",
  },

  onetime: {
    key: "onetime",
    labelKey: "onetime",
    badge: null,
    discountKey: null,
    visitInfoKey: null,
    visits: null,
    prices: [95, 126, 190, 252],
    deducted: [62, 82, 124, 164],
    durations: ["1.5h", "2.0h", "3.0h", "4.0h"],
    cleaners: ["1", "1", "1", "1"],
    priceType: "visit",
  },
} satisfies Record<string, Plan>;

// ─── Deep cleaning plans ──────────────────────────────────────────────────────

export const DEEP_PLANS = {
  monthly: {
    key: "monthly",
    labelKey: "deepMonthly",
    badge: null,
    discountKey: "cleaners15Discount", // "15% off one-time price"
    visitInfoKey: "deepMonthlyVisits", // "1 visit/month"
    visitsCount: 1,
    visitsPerYear: null,
    prices: [134, 187, 268, 321],
    deducted: [87, 122, 174, 209],
    durations: ["2.5h", "3.5h", "5.0h", "6.0h (3+3)"],
    cleaners: ["1", "1", "1 or 2", "2"],
    priceType: "monthly",
  },

  quarterly: {
    key: "quarterly",
    labelKey: "deepQuarterly",
    badge: "recommended", // pre-selected default for deep
    discountKey: "cleaners10Discount", // "10% off one-time price"
    visitInfoKey: "deepQuarterlyVisits", // "4 visits/year"
    visitsCount: 4,
    visitsPerYear: 4, // triggers "4×/year" chip on card
    prices: [142, 199, 284, 340],
    deducted: [92, 129, 185, 221],
    durations: ["2.5h", "3.5h", "5.0h", "6.0h (3+3)"],
    cleaners: ["1", "1", "1 or 2", "2"],
    priceType: "visit",
  },

  onetime: {
    key: "onetime",
    labelKey: "deepOnetime",
    badge: null,
    discountKey: null,
    visitInfoKey: null,
    visitsCount: null,
    visitsPerYear: null,
    prices: [158, 221, 315, 378],
    deducted: [103, 144, 205, 246],
    durations: ["2.5h", "3.5h", "5.0h", "6.0h (3+3)"],
    cleaners: ["1", "1", "1 or 2", "2"],
    priceType: "visit",
  },
} satisfies Record<string, Plan>;
