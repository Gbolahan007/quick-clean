import type { Plan } from "@/app/types/booking";

export const MOVE_OUT_PLANS: Record<string, Plan> = {
  moveout: {
    key: "moveout",
    labelKey: "moveout",
    badge: null,
    discountKey: null,
    visitInfoKey: "moveoutVisitInfo",
    priceType: "per_visit",
    prices: [158, 221, 315, 378],
    deducted: [103, 144, 205, 246],
    durations: ["2.5h", "3.5h", "5.0h", "6.0h"],
    cleaners: [1, 1, "1 or 2", 2],
    visits: null,
    visitsCount: null,
    visitsPerYear: null,
  },
};
