export type CheckoutMode = "payment" | "subscription";

export interface CreateCheckoutInput {
  bookingId: string;
  customerId: string;
  customerEmail: string;
  serviceType: string;
  frequency: string;
  apartmentKey: string;
  locale: "en" | "fi";
  successPath: string;
  cancelPath: string;
  addonsTotal?: number;
  addonNames?: string[];
}

export interface CheckoutResult {
  success: true;
  checkoutUrl: string;
  sessionId: string;
  priceId: string;
}

export interface CheckoutError {
  success: false;
  error: string;
  code: string;
}

export type CreateCheckoutResult = CheckoutResult | CheckoutError;

// ── Webhook handler result ────────────────────────────────────────────────────

export interface WebhookHandlerResult {
  handled: boolean;
  skipped?: boolean; // already processed (idempotency)
  error?: string;
}

// ── Subscription management ───────────────────────────────────────────────────

export interface CancelSubscriptionInput {
  bookingId: string;
  stripeSubId: string;
  immediateCancel?: boolean; // true = cancel now (admin only), false = period end
}

export interface CancelSubscriptionResult {
  success: boolean;
  canceledAt?: string; // ISO timestamp
  accessUntil?: string; // ISO timestamp (current_period_end for graceful cancel)
  error?: string;
}

// ── Stripe Price ID resolution ────────────────────────────────────────────────

export interface PriceResolutionInput {
  serviceType: string;
  frequency: string;
  apartmentKey: string;
}

export interface PriceResolutionResult {
  priceId: string;
  mode: CheckoutMode;
}
