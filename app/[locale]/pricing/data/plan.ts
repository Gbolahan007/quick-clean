import { Plan } from "@/app/types/pricing";

export const MAINTENANCE_PLANS = {
  weekly: {
    key: "weekly",
    labelKey: "weekly",
    badge: null,
    discountKey: null,
    visitInfoKey: "weeklyVisits", // "4× / month"
    visits: 4,
    prices: [341, 456, 677, 907],
    deducted: [222, 296, 440, 589],
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
    prices: [190, 252, 379, 504],
    deducted: [124, 164, 246, 328],
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
    prices: [104, 139, 209, 277],
    deducted: [68, 90, 136, 180],
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
    prices: [114, 151, 228, 302],
    deducted: [74, 98, 149, 197],
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
    prices: [161, 224, 322, 385],
    deducted: [104, 146, 209, 251],
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
    prices: [170, 239, 341, 408],
    deducted: [110, 155, 222, 265],
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
    prices: [190, 265, 378, 454],
    deducted: [124, 173, 246, 295],
    durations: ["2.5h", "3.5h", "5.0h", "6.0h (3+3)"],
    cleaners: ["1", "1", "1 or 2", "2"],
    priceType: "visit",
  },
} satisfies Record<string, Plan>;
