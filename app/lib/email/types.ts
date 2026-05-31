export type EmailLocale = "en" | "fi";

export interface BookingEmailData {
  // ── Customer ───────────────────────────────────────────────────────────────
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;

  // ── Booking ────────────────────────────────────────────────────────────────
  bookingId: string;
  serviceType: string;
  planLabel: string;
  cleaningDate: string;
  cleaningTime: string;
  estimatedDuration: string;
  address: string;
  totalPrice: string;
  paymentMethod: string;
  subscriptionPlan: string;
  nextCleaningDate?: string;
  specialInstructions?: string;
  cleanerName?: string;

  // ── Meta ───────────────────────────────────────────────────────────────────
  locale: EmailLocale;
  createdAt: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BookingEmailResults {
  customer: EmailResult;
  admin: EmailResult;
}
