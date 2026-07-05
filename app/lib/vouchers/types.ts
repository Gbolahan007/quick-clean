export interface VoucherRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number; // percentage: 1–100 | fixed_amount: cents
  stripe_coupon_id: string;
  applicable_services: string[] | null; // null = all services
  is_active: boolean;
  max_uses: number | null;
  times_used: number;
  max_uses_per_customer: number;
  expires_at: string | null;
}

// ── Result of server-side voucher validation ──────────────────────────────────
// Returned by validateVoucher(). No DB mutations happen during validation.

export type VoucherValidationResult =
  | {
      valid: true;
      voucher: VoucherRow;
      discountAmountCents: number; // concrete saving in cents for this booking
    }
  | {
      valid: false;
      error: string; // user-facing message
    };

// ── Discount decision produced by the discount engine ────────────────────────
// Represents the single winning discount to apply to a booking.

export type DiscountSource = "first_booking" | "voucher";

export interface DiscountDecision {
  source: DiscountSource;
  discountAmountCents: number;
  originalAmountCents: number;
  finalAmountCents: number;

  voucherId: string | null;
  voucherCode: string | null;
  stripeCouponId: string; // always present — snapshot from voucher or first-booking env var

  // Convenience flags
  isFree: boolean; // finalAmountCents === 0
}

export interface NoDiscount {
  source: null;
  discountAmountCents: 0;
  originalAmountCents: number;
  finalAmountCents: number;
  voucherId: null;
  voucherCode: null;
  stripeCouponId: null;
  isFree: false;
}

export type DiscountResult = DiscountDecision | NoDiscount;

// ── Voucher preview returned to the client ────────────────────────────────────
// Safe subset — never expose full VoucherRow to the client.

export interface VoucherPreview {
  valid: true;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  discountAmountCents: number;
  finalAmountCents: number;
}

export type VoucherPreviewResult =
  | VoucherPreview
  | { valid: false; error: string };
