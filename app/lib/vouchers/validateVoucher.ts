"use server";
// app/lib/vouchers/validateVoucher.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side voucher validation. Pure function — no DB mutations.
// Returns a preview with the concrete discount amount for this booking.
//
// RULES ENFORCED:
//   1. Voucher exists and is active
//   2. Not expired
//   3. Global max_uses not exceeded
//   4. Per-customer limit not exceeded (checks voucher_redemptions)
//   5. Applicable to the booking's service type
//   6. Office bookings are always rejected
//
// Called from:
//   - previewVoucherAction (server action) → client preview in StepReview
//   - submitBookingAction → revalidation before booking creation (never trust preview)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import type { VoucherRow, VoucherValidationResult } from "./types";
import { calculateDiscountCents } from "./discountUtils";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Main validator ────────────────────────────────────────────────────────────

export async function validateVoucher(params: {
  code: string;
  customerId: string;
  serviceType: string;
  originalAmountCents: number;
}): Promise<VoucherValidationResult> {
  const { code, customerId, serviceType, originalAmountCents } = params;

  // ── Office bookings are excluded from all voucher discounts ──────────────
  if (serviceType === "office") {
    return {
      valid: false,
      error: "Vouchers are not applicable to office cleaning bookings.",
    };
  }

  if (!code.trim()) {
    return { valid: false, error: "Please enter a voucher code." };
  }

  const supabase = getServiceClient();

  // ── Fetch voucher ─────────────────────────────────────────────────────────
  const { data: voucher, error: fetchError } = await supabase
    .from("vouchers")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();

  if (fetchError) {
    console.error("[validateVoucher] DB error:", fetchError.message);
    return {
      valid: false,
      error: "Unable to validate voucher. Please try again.",
    };
  }

  if (!voucher) {
    return { valid: false, error: "Voucher code not found." };
  }

  // ── Active check ──────────────────────────────────────────────────────────
  if (!voucher.is_active) {
    return { valid: false, error: "This voucher is no longer active." };
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return { valid: false, error: "This voucher has expired." };
  }

  // ── Global max uses check ─────────────────────────────────────────────────
  if (voucher.max_uses !== null && voucher.times_used >= voucher.max_uses) {
    return {
      valid: false,
      error: "This voucher has reached its maximum uses.",
    };
  }

  // ── Applicable services check ─────────────────────────────────────────────
  // null = all residential services allowed
  if (
    voucher.applicable_services !== null &&
    voucher.applicable_services.length > 0 &&
    !voucher.applicable_services.includes(serviceType)
  ) {
    return {
      valid: false,
      error: "This voucher is not valid for the selected service.",
    };
  }

  // ── Per-customer limit check ──────────────────────────────────────────────
  const { count: timesUsedByCustomer, error: redemptionError } = await supabase
    .from("voucher_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("voucher_id", voucher.id)
    .eq("customer_id", customerId);

  if (redemptionError) {
    console.error(
      "[validateVoucher] Redemption count error:",
      redemptionError.message,
    );
    return {
      valid: false,
      error: "Unable to validate voucher. Please try again.",
    };
  }

  if ((timesUsedByCustomer ?? 0) >= voucher.max_uses_per_customer) {
    return {
      valid: false,
      error:
        voucher.max_uses_per_customer === 1
          ? "You have already used this voucher."
          : `You have reached the maximum uses for this voucher.`,
    };
  }

  // ── Calculate discount ────────────────────────────────────────────────────
  const discountAmountCents = calculateDiscountCents(
    voucher,
    originalAmountCents,
  );

  return {
    valid: true,
    voucher: voucher as VoucherRow,
    discountAmountCents,
  };
}
