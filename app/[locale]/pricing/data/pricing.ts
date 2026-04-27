import { ADDONS } from "./addOns";
import { APARTMENT_TYPES } from "./apartmentType";

/**
 * Shared types
 */
type ApartmentType = {
  key: string;
};

type Plan = {
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
 * Returns the array index of an apartment key (0–3).
 * Returns null if the key is not found.
 */
export function aptIndex(key: string): number | null {
  const idx = APARTMENT_TYPES.findIndex((a: ApartmentType) => a.key === key);

  return idx === -1 ? null : idx;
}

/**
 * Returns the display price for a plan at a given apartment index.
 * Respects the showDeducted toggle.
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
 * Computes add-on totals from a qty map { [addonKey]: number }.
 * Returns { selectedCount, rawTotal, discount, discountedTotal }.
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
 * Builds the URLSearchParams string used when handing off to the booking page.
 * /booking?service=maintenance&apt=studio&plan=biweekly&deducted=0&addons={…}
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
