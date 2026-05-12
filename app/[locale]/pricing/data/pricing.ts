import { ApartmentType } from "../components/SummaryBar";
import { ADDONS } from "./addOns";

export const APARTMENTS: ApartmentType[] = [
  {
    key: "studio",
    labelKey: "studio",
    size: "up to 35 m²",
    emoji: "🏠",
    squareMeters: 30,
    numberOfRooms: 1,
  },
  {
    key: "two",
    labelKey: "two",
    size: "35–55 m²",
    emoji: "🏡",
    squareMeters: 45,
    numberOfRooms: 2,
  },
  {
    key: "three",
    labelKey: "three",
    size: "55–75 m²",
    emoji: "🏘",
    squareMeters: 65,
    numberOfRooms: 3,
  },
  {
    key: "four",
    labelKey: "four",
    size: "75–100 m²",
    emoji: "🏢",
    squareMeters: 85,
    numberOfRooms: 4,
  },
];
/**
 * Plan pricing structure
 */
export type Plan = {
  prices: number[];
  deducted: number[];
};

type QtyMap = Record<string, number>;

type BookingParamsInput = {
  serviceType: string;
  apt?: ApartmentType | null;
  plan?: string | null;
  showDeducted: boolean;
  addons: QtyMap;
};

type AddonTotals = {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
};

/**
 * Returns apartment index
 */
export function aptIndex(key: string): number | null {
  const idx = APARTMENTS.findIndex((a) => a.key === key);
  return idx === -1 ? null : idx;
}

/**
 * Get plan price based on apartment + VAT toggle
 */
export function getPrice(
  plan: Plan | null | undefined,
  idx: number | null,
  showDeducted: boolean,
): number | null {
  if (idx === null || !plan) return null;

  return showDeducted
    ? (plan.deducted[idx] ?? null)
    : (plan.prices[idx] ?? null);
}

/**
 * Calculate add-on totals
 */
export function calcAddonTotals(
  qtyMap: QtyMap,
  showDeducted: boolean,
): AddonTotals {
  let selectedCount = 0;
  let rawTotal = 0;

  for (const addon of ADDONS as Array<{
    key: string;
    price: number;
    deducted: number;
  }>) {
    const qty = qtyMap[addon.key] ?? 0;

    if (qty > 0) {
      selectedCount += 1;
      rawTotal += qty * (showDeducted ? addon.deducted : addon.price);
    }
  }

  const discount = selectedCount >= 2 ? 0.1 : 0;
  const discountedTotal = Math.round(rawTotal * (1 - discount));

  return {
    selectedCount,
    rawTotal,
    discount,
    discountedTotal,
  };
}

/**
 * Build booking URL params
 */
export function buildBookingParams({
  serviceType,
  apt,
  plan,
  showDeducted,
  addons,
}: BookingParamsInput): string {
  return new URLSearchParams({
    service: serviceType,
    apt: apt?.key ?? "",
    plan: plan ?? "",
    deducted: showDeducted ? "1" : "0",
    addons: JSON.stringify(addons),
  }).toString();
}
