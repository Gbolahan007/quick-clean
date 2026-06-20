// app/lib/email/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the Frosh email system.
// Every email function takes one of these typed input objects.
// ─────────────────────────────────────────────────────────────────────────────

export type EmailLocale = "en" | "fi";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BookingEmailResults {
  customer: EmailResult;
  admin: EmailResult;
}

// ── 1. Booking submitted (before payment) ────────────────────────────────────
export interface BookingSubmittedEmailInput {
  locale: EmailLocale;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  serviceType: string;
  planLabel: string;
  frequency: string;
  apartmentSize: string;
  bookingDate: string; // "2026-06-15"
  timeSlot: string; // "11:00"
  finalPrice: number;
  createdAt: string;
}

// ── 2. Payment successful — one-time ────────────────────────────────────────
export interface PaymentSuccessEmailInput {
  locale: EmailLocale;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  serviceType: string;
  planLabel: string;
  amountCents: number;
  currency: string;
  paidAt: string;
  stripePaymentIntentId: string;
  bookingDate: string;
  timeSlot: string;
  apartmentSize: string;
}

// ── 3. Subscription activated ────────────────────────────────────────────────
export interface SubscriptionActivatedEmailInput {
  locale: EmailLocale;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  planLabel: string;
  frequency: string;
  visitsPerMonth: number | null;
  firstBillingDate: string; // current_period_end ISO
  stripeSubscriptionId: string;
  amountCents: number;
  currency: string;
}

// ── 4. Monthly renewal successful ────────────────────────────────────────────
export interface RenewalSuccessEmailInput {
  locale: EmailLocale;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  planLabel: string;
  amountCents: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  visitsCovered: number | null;
  stripeInvoiceId: string;
}

// ── 5. Payment failed — already in paymentEmails.ts ─────────────────────────
// (kept for reference — see sendPaymentFailedEmail)

// ── 6. Subscription cancelled — already in paymentEmails.ts ─────────────────
// Extended version that also sends admin copy

export interface SubscriptionCancelledEmailInput {
  locale: EmailLocale;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  planLabel: string;
  canceledAt: string;
  accessUntil: string | null; // current_period_end if graceful cancel
}

// ── 7. Refund issued ─────────────────────────────────────────────────────────
export interface RefundEmailInput {
  locale: EmailLocale;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  refundAmountCents: number;
  currency: string;
  refundedAt: string;
  stripeRefundId: string;
  isFullRefund: boolean;
}

// ── Legacy BookingEmailData (kept for backward compat with existing templates)
export interface BookingEmailData {
  bookingId: string;
  locale: EmailLocale;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceType: string;
  planLabel: string;
  cleaningDate: string;
  cleaningTime: string;
  estimatedDuration: string;
  address: string;
  cleanerName?: string;
  totalPrice: string;
  paymentMethod: string;
  subscriptionPlan: string;
  nextCleaningDate?: string;
  specialInstructions?: string;
  createdAt: string;
}
