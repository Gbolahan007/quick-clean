export interface VoucherRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  stripe_coupon_id: string;
  applicable_services: string[] | null;
  is_active: boolean;
  max_uses: number | null;
  times_used: number;
  max_uses_per_customer: number;
  expires_at: string | null;
}

// ── Result of server-side voucher validation ──────────────────────────────────

export type VoucherValidationResult =
  | {
      valid: true;
      voucher: VoucherRow;
      discountAmountCents: number;
    }
  | {
      valid: false;
      error: string;
    };

// ── Discount decision produced by the discount engine ────────────────────────

export type DiscountSource = "first_booking" | "voucher";

export interface DiscountDecision {
  source: DiscountSource;
  discountAmountCents: number;
  originalAmountCents: number;
  finalAmountCents: number;

  voucherId: string | null;
  voucherCode: string | null;
  stripeCouponId: string;

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
