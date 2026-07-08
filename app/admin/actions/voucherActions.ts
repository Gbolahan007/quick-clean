"use server";
// app/admin/actions/voucherActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Admin server actions for voucher management.
//
// CREATE FLOW:
//   1. Validate input server-side
//   2. Create Stripe coupon via Stripe API (automatic — no manual step)
//   3. Insert voucher row with stripe_coupon_id from Stripe response
//   4. Write audit log
//
// DEACTIVATE FLOW:
//   1. Set is_active = false in DB (does NOT delete Stripe coupon)
//   2. Existing bookings that used this voucher are unaffected
//   3. Future redemptions are blocked by validateVoucher() is_active check
//   4. Write audit log
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { withAdmin } from "@/app/lib/supabase/admin";
import { writeAuditLog, AUDIT_ACTIONS } from "@/app/lib/admin/auditLog";
import { getStripe } from "@/app/lib/stripe/stripeClient";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateVoucherInput {
  code: string;
  description: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number; // percentage: 1–100 | fixed_amount: euros (converted to cents for Stripe)
  maxUses: number | null; // null = unlimited
  maxUsesPerCustomer: number;
  applicableServices: string[]; // empty array = all residential services
  expiresAt: string | null; // ISO date string or null
}

// ─────────────────────────────────────────────────────────────────────────────
// createVoucher
// ─────────────────────────────────────────────────────────────────────────────

export const createVoucher = withAdmin(
  async (admin, input: CreateVoucherInput) => {
    // ── Validation ────────────────────────────────────────────────────────────
    const code = input.code.toUpperCase().trim().replace(/\s+/g, "");
    if (!code) throw new Error("Voucher code is required");
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error(
        "Code must contain only letters, numbers, hyphens and underscores",
      );
    }
    if (!input.description.trim()) throw new Error("Description is required");
    if (input.discountValue <= 0)
      throw new Error("Discount value must be greater than zero");
    if (input.discountType === "percentage" && input.discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }
    if (input.maxUsesPerCustomer < 1)
      throw new Error("Max uses per customer must be at least 1");

    const supabase = getServiceClient();

    // ── Check code uniqueness ─────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("vouchers")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (existing) throw new Error(`Voucher code "${code}" already exists`);

    // ── Create Stripe coupon ──────────────────────────────────────────────────
    // Use the voucher code as the Stripe coupon ID for easy cross-referencing.
    // duration = 'once' — coupon only applies to the first invoice.
    // This ensures subscriptions charge full price from month 2.

    const stripe = getStripe();

    const stripeCouponParams: Parameters<typeof stripe.coupons.create>[0] = {
      id: code, // Stripe coupon ID = voucher code for clarity
      name: `${code} — ${input.description}`,
      duration: "once",
      ...(input.discountType === "percentage"
        ? { percent_off: input.discountValue }
        : {
            amount_off: Math.round(input.discountValue * 100),
            currency: "eur",
          }),
      ...(input.maxUses !== null ? { max_redemptions: input.maxUses } : {}),
      ...(input.expiresAt
        ? { redeem_by: Math.floor(new Date(input.expiresAt).getTime() / 1000) }
        : {}),
    };

    let stripeCoupon;
    try {
      stripeCoupon = await stripe.coupons.create(stripeCouponParams);
    } catch (stripeError) {
      const msg =
        stripeError instanceof Error ? stripeError.message : "Stripe error";
      throw new Error(`Failed to create Stripe coupon: ${msg}`);
    }

    // ── Insert voucher row ────────────────────────────────────────────────────
    const { data: voucher, error: insertError } = await supabase
      .from("vouchers")
      .insert({
        code,
        description: input.description.trim(),
        discount_type: input.discountType,
        discount_value: input.discountValue,
        stripe_coupon_id: stripeCoupon.id,
        applicable_services:
          input.applicableServices.length > 0 ? input.applicableServices : null,
        is_active: true,
        max_uses: input.maxUses,
        times_used: 0,
        max_uses_per_customer: input.maxUsesPerCustomer,
        expires_at: input.expiresAt ?? null,
      })
      .select("id, code")
      .single();

    if (insertError) {
      // Stripe coupon was created but DB insert failed — attempt Stripe cleanup
      await stripe.coupons.del(stripeCoupon.id).catch(() => null);
      throw new Error(`Failed to save voucher: ${insertError.message}`);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.VOUCHER_CREATED,
      entityType: "voucher",
      entityId: voucher.id,
      afterSnapshot: {
        code,
        discount_type: input.discountType,
        discount_value: input.discountValue,
        stripe_coupon_id: stripeCoupon.id,
        max_uses: input.maxUses,
      },
    });

    revalidatePath("/admin/vouchers");
    return { id: voucher.id, code: voucher.code };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// deactivateVoucher
// ─────────────────────────────────────────────────────────────────────────────

export const deactivateVoucher = withAdmin(async (admin, voucherId: string) => {
  if (!voucherId) throw new Error("voucherId is required");

  const supabase = getServiceClient();

  const { data: voucher, error: fetchError } = await supabase
    .from("vouchers")
    .select(
      "id, code, is_active, stripe_coupon_id, discount_type, discount_value",
    )
    .eq("id", voucherId)
    .single();

  if (fetchError || !voucher) throw new Error("Voucher not found");
  if (!voucher.is_active) throw new Error("Voucher is already inactive");

  const { error: updateError } = await supabase
    .from("vouchers")
    .update({ is_active: false })
    .eq("id", voucherId);

  if (updateError)
    throw new Error(`Failed to deactivate: ${updateError.message}`);

  await writeAuditLog({
    admin,
    action: AUDIT_ACTIONS.VOUCHER_DEACTIVATED,
    entityType: "voucher",
    entityId: voucherId,
    beforeSnapshot: { is_active: true, code: voucher.code },
    afterSnapshot: { is_active: false, code: voucher.code },
  });

  revalidatePath("/admin/vouchers");
  revalidatePath(`/admin/vouchers/${voucherId}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// reactivateVoucher
// ─────────────────────────────────────────────────────────────────────────────

export const reactivateVoucher = withAdmin(async (admin, voucherId: string) => {
  if (!voucherId) throw new Error("voucherId is required");

  const supabase = getServiceClient();

  const { data: voucher, error: fetchError } = await supabase
    .from("vouchers")
    .select("id, code, is_active, expires_at, max_uses, times_used")
    .eq("id", voucherId)
    .single();

  if (fetchError || !voucher) throw new Error("Voucher not found");
  if (voucher.is_active) throw new Error("Voucher is already active");

  // Guard: don't reactivate if expired or exhausted
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    throw new Error(
      "Cannot reactivate an expired voucher — update the expiry date first",
    );
  }
  if (voucher.max_uses !== null && voucher.times_used >= voucher.max_uses) {
    throw new Error(
      "Cannot reactivate a fully exhausted voucher — increase max_uses first",
    );
  }

  const { error: updateError } = await supabase
    .from("vouchers")
    .update({ is_active: true })
    .eq("id", voucherId);

  if (updateError)
    throw new Error(`Failed to reactivate: ${updateError.message}`);

  await writeAuditLog({
    admin,
    action: AUDIT_ACTIONS.VOUCHER_UPDATED,
    entityType: "voucher",
    entityId: voucherId,
    beforeSnapshot: { is_active: false },
    afterSnapshot: { is_active: true },
    metadata: { action: "reactivated" },
  });

  revalidatePath("/admin/vouchers");
  revalidatePath(`/admin/vouchers/${voucherId}`);
});
