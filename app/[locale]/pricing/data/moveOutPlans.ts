import type { Plan } from "@/app/types/booking";

export const MOVE_OUT_PLANS: Record<string, Plan> = {
  moveout: {
    key: "moveout",
    labelKey: "moveout",
    badge: null,
    discountKey: null,
    visitInfoKey: "moveoutVisitInfo",
    priceType: "per_visit",
    prices: [190, 265, 378, 454],
    deducted: [124, 173, 246, 295],
    durations: ["2.5h", "3.5h", "5.0h", "6.0h"],
    cleaners: [1, 1, "1 or 2", 2],
    visits: null,
    visitsCount: null,
    visitsPerYear: null,
  },
};
