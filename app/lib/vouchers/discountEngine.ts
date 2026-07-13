"use server";
// app/lib/vouchers/discountEngine.ts
// ─────────────────────────────────────────────────────────────────────────────
// Discount selection engine.
//
// RESPONSIBILITIES:
//   1. Determine if a customer qualifies for the first-booking discount
//   2. Given an optional validated voucher, select the best discount
//   3. Return a single DiscountResult — never two discounts
//
// RULES:
//   - Only one discount is ever applied
//   - If both discounts exist, choose the one with the larger saving
//   - On a tie, prefer the voucher (analytics + determinism)
//   - First-booking eligibility is based on confirmed+paid bookings only
//   - Cancelled / failed / pending bookings do NOT count
//   - Only "maintenance" and "deep" service types are eligible for discounts
//   - Move-out and office bookings are excluded from all discounts
//   - Eligibility is evaluated at submission time — not locked in on booking creation
//     It becomes immutable only after successful payment (webhook confirms)
//
// FIRST-BOOKING STRIPE COUPON:
//   Stored in env var STRIPE_COUPON_FIRST_BOOKING
//   Must be a pre-created Stripe Coupon with 25% off, duration=once
// ─────────────────────────────────────────────────────────────────────────────

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
// Counts confirmed+paid bookings for this customer, excluding office bookings.
// Pending, cancelled, and failed bookings do not count.

export async function isFirstBookingEligible(
  customerId: string,
  serviceType: string,
): Promise<boolean> {
  // Only home cleaning services (maintenance + deep) are eligible
  // Move-out and office bookings are excluded from the first-booking discount
  const ELIGIBLE_SERVICES = ["maintenance", "deep"];
  if (!ELIGIBLE_SERVICES.includes(serviceType)) return false;

  const supabase = getServiceClient();

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .in("service_type", ["maintenance", "deep"]); // only count home cleaning bookings

  if (error) {
    console.error("[discountEngine] First-booking check error:", error.message);
    // Fail safe — do not grant discount if we cannot confirm eligibility
    return false;
  }

  return (count ?? 0) === 0;
}

// ── Discount engine ───────────────────────────────────────────────────────────
// Selects the single best discount to apply.
// Called from submitBookingAction after all validation is complete.

export async function selectDiscount(params: {
  customerId: string;
  serviceType: string;
  originalAmountCents: number;
  validatedVoucher: VoucherRow | null; // null if no voucher entered or validation failed
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

  // First-booking eligible but STRIPE_COUPON_FIRST_BOOKING env var not set —
  // log and fall through to no discount rather than crashing.
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
