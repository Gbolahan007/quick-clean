import type { VoucherRow } from "./types";

export function calculateDiscountCents(
  voucher: VoucherRow,
  originalAmountCents: number,
): number {
  if (voucher.discount_type === "percentage") {
    return Math.round((originalAmountCents * voucher.discount_value) / 100);
  }
  // fixed_amount: cap at original amount (cannot discount more than the price)
  return Math.min(voucher.discount_value, originalAmountCents);
}
