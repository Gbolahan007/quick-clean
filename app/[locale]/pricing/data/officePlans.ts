import type { Plan } from "@/app/types/booking";

export const OFFICE_PLANS: Record<string, Plan> = {
  // ── Tier 1: 2–10 hrs/week — €49.00/h incl. VAT ───────────────────────────
  // Monthly estimates: 4h×4.33=€848→€850 | 8h×4.33=€1,697→€1,700
  // Shown as monthly totals per space size
  "office-tier1": {
    key: "office-tier1",
    labelKey: "officeTier1",
    badge: null,
    discountKey: null,
    visitInfoKey: "officeTier1Hours",
    priceType: "monthly",
    // prices[i] = monthly price for each space size at Tier 1 rate
    // small: 4h/week × 4.33 × €49 ≈ €850
    // medium: 8h/week × 4.33 × €49 ≈ €1,700
    // large: would be Tier 2 — shown as upgrade prompt
    // xl: would be Tier 3 — shown as upgrade prompt
    prices: [850, 1700, 2860, 4330],
    deducted: [850, 1700, 2860, 4330], // no household deduction for commercial
    durations: ["4h/week", "8h/week", "15h/week", "25h/week"],
    cleaners: [1, 1, 2, 2],
    visits: null,
    visitsCount: null,
    visitsPerYear: null,
  },

  // ── Tier 2: 11–20 hrs/week — €44.00/h incl. VAT ─────────────────────────
  // Monthly estimates: 15h×4.33=€2,858→€2,860 | 20h×4.33=€3,810→€3,810
  "office-tier2": {
    key: "office-tier2",
    labelKey: "officeTier2",
    badge: "popular",
    discountKey: null,
    visitInfoKey: "officeTier2Hours",
    priceType: "monthly",
    prices: [760, 1525, 2860, 3810],
    deducted: [760, 1525, 2860, 3810],
    durations: ["4h/week", "8h/week", "15h/week", "20h/week"],
    cleaners: [1, 1, 2, 2],
    visits: null,
    visitsCount: null,
    visitsPerYear: null,
  },

  // ── Tier 3: 21+ hrs/week — €40.00/h incl. VAT ────────────────────────────
  // Monthly estimates: 25h×4.33=€4,330 | custom for smaller spaces
  "office-tier3": {
    key: "office-tier3",
    labelKey: "officeTier3",
    badge: null,
    discountKey: null,
    visitInfoKey: "officeTier3Hours",
    priceType: "monthly",
    prices: [695, 1390, 2600, 4330],
    deducted: [695, 1390, 2600, 4330],
    durations: ["4h/week", "8h/week", "15h/week", "25h/week"],
    cleaners: [1, 1, 2, 2],
    visits: null,
    visitsCount: null,
    visitsPerYear: null,
  },

  // ── One-time / Post-event deep clean ─────────────────────────────────────
  // Billed at Tier 1 rate (€49/h), minimum 3h
  "office-deep": {
    key: "office-deep",
    labelKey: "officeDeep",
    badge: null,
    discountKey: null,
    visitInfoKey: null,
    priceType: "per_visit",
    // per-visit price: hourly_rate × duration
    // small: 3h × €49 = €147 → €150
    // medium: 4h × €49 = €196 → €200
    // large: 6h × €49 = €294 → €295
    // xl: 8h × €49 = €392 → €395
    prices: [150, 200, 295, 395],
    deducted: [150, 200, 295, 395],
    durations: ["3h", "4h", "6h", "8h"],
    cleaners: [1, 1, 2, 2],
    visits: null,
    visitsCount: null,
    visitsPerYear: null,
  },
};
