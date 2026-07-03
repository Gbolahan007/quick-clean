"use server";
// app/actions/previewVoucher.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server action called from StepReview when customer clicks "Apply".
// Returns a preview of the discount — NO DB mutations.
// The real validation + application happens in submitBookingAction.
//
// IMPORTANT: This preview is for display only. Never trust it in submitBookingAction.
// Always revalidate the voucher server-side at submission time.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { validateVoucher } from "@/app/lib/vouchers/validateVoucher";
import type { VoucherPreviewResult } from "@/app/lib/vouchers/types";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function previewVoucherAction(params: {
  code: string;
  email: string; // used to look up customerId
  serviceType: string;
  originalAmountCents: number;
}): Promise<VoucherPreviewResult> {
  const { code, email, serviceType, originalAmountCents } = params;

  if (!code.trim()) {
    return { valid: false, error: "Please enter a voucher code." };
  }

  const supabase = getServiceClient();

  // Resolve customerId from email
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  // If no customer row yet (first-time guest), we still validate the voucher
  // against global rules. Per-customer limit check requires a customer ID.
  const customerId = customer?.id ?? null;

  if (!customerId) {
    // New guest — no redemption history, skip per-customer check
    // by passing a fake ID that will match 0 redemptions.
    // We use a nil UUID so the query returns 0 rows cleanly.
    const NIL_UUID = "00000000-0000-0000-0000-000000000000";
    const result = await validateVoucher({
      code,
      customerId: NIL_UUID,
      serviceType,
      originalAmountCents,
    });

    if (!result.valid) return { valid: false, error: result.error };

    const finalAmountCents = Math.max(
      0,
      originalAmountCents - result.discountAmountCents,
    );

    return {
      valid: true,
      code: result.voucher.code,
      description: result.voucher.description,
      discountType: result.voucher.discount_type,
      discountValue: result.voucher.discount_value,
      discountAmountCents: result.discountAmountCents,
      finalAmountCents,
    };
  }

  const result = await validateVoucher({
    code,
    customerId,
    serviceType,
    originalAmountCents,
  });

  if (!result.valid) return { valid: false, error: result.error };

  const finalAmountCents = Math.max(
    0,
    originalAmountCents - result.discountAmountCents,
  );

  return {
    valid: true,
    code: result.voucher.code,
    description: result.voucher.description,
    discountType: result.voucher.discount_type,
    discountValue: result.voucher.discount_value,
    discountAmountCents: result.discountAmountCents,
    finalAmountCents,
  };
}
