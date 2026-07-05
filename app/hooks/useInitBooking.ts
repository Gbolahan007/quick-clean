"use client";

import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBookingStore } from "../store/useBookingStore";
import { ADDONS } from "../[locale]/pricing/data/addOns";
import type {
  ApartmentType,
  AddonsSummary,
  BookingFrequency,
  PricingSnapshot,
  ServiceType,
} from "../types/booking";
import type { Plan } from "../types/booking";
import { aptIndex, getPrice } from "../[locale]/pricing/data/pricing";

interface UseInitBookingParams {
  serviceType: ServiceType;
  apt: ApartmentType | null;
  planKey: string | null;
  plans: Record<string, Plan>;
  showDeducted: boolean;
  addonsSummary: AddonsSummary;
}

// ── Frequency resolution ────────────────────────────────────────────────────

function resolveFrequency(
  planKey: string,
  serviceType: ServiceType,
): BookingFrequency {
  // ── Maintenance ─────────────────────────────────────────────────────────────
  if (planKey === "weekly") return "weekly";
  if (planKey === "biweekly") return "biweekly";
  if (planKey === "monthly") return "monthly";

  // ── Deep cleaning ───────────────────────────────────────────────────────────

  if (serviceType === "deep") {
    if (planKey.includes("quarterly") || planKey.includes("Quarterly"))
      return "deepQuarterly";
    if (planKey.includes("monthly") || planKey.includes("Monthly"))
      return "deepMonthly";
    return "deepOnetime";
  }

  // ── Moveout ─────────────────────────────────────────────────────────────────
  if (serviceType === "moveout") return "one-time";

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return "one-time";
}

export function useInitBooking({
  serviceType,
  apt,
  planKey,
  plans,
  showDeducted,
  addonsSummary,
}: UseInitBookingParams) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("pricing");
  const initBooking = useBookingStore((s) => s.initBooking);

  const onBook = useCallback(() => {
    if (!apt || !planKey) return;

    const plan = plans[planKey];
    if (!plan) return;

    const idx = aptIndex(apt.key);
    const basePrice = getPrice(plan, idx, showDeducted) ?? 0;
    const totalPrice = basePrice + (addonsSummary?.discountedTotal ?? 0);

    const selectedAddonNames: string[] = Object.entries(
      addonsSummary?.qtyMap ?? {},
    )
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const addon = ADDONS.find((a) => a.key === key);
        if (!addon) return null;
        const label = t(`addons.${addon.labelKey}.label`);
        return qty > 1 ? `${label} ×${qty}` : label;
      })
      .filter(Boolean) as string[];

    const snapshot: PricingSnapshot = {
      serviceType,
      showDeducted,
      apartment: { ...apt },
      planKey,
      planLabel: t(`plans.${plan.labelKey}`),
      frequency: resolveFrequency(planKey, serviceType), // ← fixed
      basePrice,
      addonsSummary: addonsSummary ?? {
        selectedCount: 0,
        rawTotal: 0,
        discount: 0,
        discountedTotal: 0,
        qtyMap: {},
      },
      selectedAddonNames,
      totalPrice,
    };

    initBooking(snapshot);
    router.push(`/${locale}/booking`);
  }, [
    apt,
    planKey,
    plans,
    showDeducted,
    addonsSummary,
    serviceType,
    locale,
    t,
    initBooking,
    router,
  ]);

  return { onBook };
}
