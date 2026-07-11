"use server";

import { createClient } from "@supabase/supabase-js";
import type { DiscountResult, VoucherRow } from "./types";
import { calculateDiscountCents } from "./discountUtils";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

const FIRST_BOOKING_DISCOUNT_PERCENT = 25;

// ── First-booking eligibility check ──────────────────────────────────────────

export async function isFirstBookingEligible(
  customerId: string,
  serviceType: string,
): Promise<boolean> {
  if (serviceType === "office") return false;

  const supabase = getServiceClient();

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .neq("service_type", "office");

  if (error) {
    console.error("[discountEngine] First-booking check error:", error.message);

    return false;
  }

  return (count ?? 0) === 0;
}

// ── Discount engine ───────────────────────────────────────────────────────────
// Selects the single best discount to apply.

export async function selectDiscount(params: {
  customerId: string;
  serviceType: string;
  originalAmountCents: number;
  validatedVoucher: VoucherRow | null;
}): Promise<DiscountResult> {
  const { customerId, serviceType, originalAmountCents, validatedVoucher } =
    params;

  // ── First-booking discount ────────────────────────────────────────────────
  const firstBookingEligible = await isFirstBookingEligible(
    customerId,
    serviceType,
  );

  const firstBookingCouponId = process.env.STRIPE_COUPON_FIRST_BOOKING;

  const firstBookingDiscountCents = firstBookingEligible
    ? Math.round((originalAmountCents * FIRST_BOOKING_DISCOUNT_PERCENT) / 100)
    : 0;

  // ── Voucher discount ──────────────────────────────────────────────────────
  const voucherDiscountCents = validatedVoucher
    ? calculateDiscountCents(validatedVoucher, originalAmountCents)
    : 0;

  // ── No discount ───────────────────────────────────────────────────────────
  if (!firstBookingEligible && !validatedVoucher) {
    return {
      source: null,
      discountAmountCents: 0,
      originalAmountCents,
      finalAmountCents: originalAmountCents,
      voucherId: null,
      voucherCode: null,
      stripeCouponId: null,
      isFree: false,
    };
  }

  // ── Winner selection ──────────────────────────────────────────────────────
  // Prefer voucher on tie (analytics + determinism per spec).
  const useVoucher =
    validatedVoucher !== null &&
    voucherDiscountCents >= firstBookingDiscountCents;

  if (useVoucher && validatedVoucher) {
    const finalAmountCents = Math.max(
      0,
      originalAmountCents - voucherDiscountCents,
    );
    return {
      source: "voucher",
      discountAmountCents: voucherDiscountCents,
      originalAmountCents,
      finalAmountCents,
      voucherId: validatedVoucher.id,
      voucherCode: validatedVoucher.code,
      stripeCouponId: validatedVoucher.stripe_coupon_id,
      isFree: finalAmountCents === 0,
    };
  }

  // First-booking discount wins
  if (firstBookingEligible && firstBookingCouponId) {
    const finalAmountCents = Math.max(
      0,
      originalAmountCents - firstBookingDiscountCents,
    );
    return {
      source: "first_booking",
      discountAmountCents: firstBookingDiscountCents,
      originalAmountCents,
      finalAmountCents,
      voucherId: null,
      voucherCode: null,
      stripeCouponId: firstBookingCouponId,
      isFree: finalAmountCents === 0,
    };
  }

  // First-booking eligible but
  if (firstBookingEligible && !firstBookingCouponId) {
    console.error(
      "[discountEngine] STRIPE_COUPON_FIRST_BOOKING is not set. " +
        "First-booking discount cannot be applied.",
    );
  }

  // Fallback — voucher only (first-booking env var missing)
  if (validatedVoucher) {
    const finalAmountCents = Math.max(
      0,
      originalAmountCents - voucherDiscountCents,
    );
    return {
      source: "voucher",
      discountAmountCents: voucherDiscountCents,
      originalAmountCents,
      finalAmountCents,
      voucherId: validatedVoucher.id,
      voucherCode: validatedVoucher.code,
      stripeCouponId: validatedVoucher.stripe_coupon_id,
      isFree: finalAmountCents === 0,
    };
  }

  // No valid discount
  return {
    source: null,
    discountAmountCents: 0,
    originalAmountCents,
    finalAmountCents: originalAmountCents,
    voucherId: null,
    voucherCode: null,
    stripeCouponId: null,
    isFree: false,
  };
}
