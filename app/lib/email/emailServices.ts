// app/lib/email/emailServices.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central email service. All transactional emails go through here.
// Used by server actions and webhook handlers.
//
// CHANGES FROM PREVIOUS VERSION:
//   - getFromAddress() and getAdminAddress() now THROW if env vars are missing
//     instead of silently falling back to an unverified domain.
//     A missing EMAIL_FROM caused Resend 422 validation errors in production.
//   - paymentEmails.ts functions re-exported here so callers import from one place.
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from "resend";
import { buildCustomerConfirmationEmail } from "./templates/customerConfirmation";
import { buildAdminNotificationEmail } from "./templates/adminNotification";
import type {
  BookingEmailData,
  BookingEmailResults,
  EmailResult,
} from "./types";

// ── Singleton Resend client ───────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

// ── Address helpers (throw on missing — no silent fallback) ───────────────────
// A missing or empty env var previously caused Resend 422 errors because the
// fallback domain (quickclean.fi) wasn't verified in Resend.
// During development: use EMAIL_FROM=onboarding@resend.dev

export function getFromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from)
    throw new Error(
      "EMAIL_FROM env var is not set. " +
        "For development use: EMAIL_FROM=onboarding@resend.dev",
    );
  return from;
}

export function getAdminAddress(): string {
  const admin = process.env.EMAIL_ADMIN;
  if (!admin)
    throw new Error(
      "EMAIL_ADMIN env var is not set. " +
        "Set it to the address that should receive admin notifications.",
    );
  return admin;
}

// ── Individual senders ────────────────────────────────────────────────────────

async function sendCustomerConfirmation(
  data: BookingEmailData,
): Promise<EmailResult> {
  try {
    const { subject, html } = buildCustomerConfirmationEmail(data);
    const resend = getResend();

    const { data: result, error } = await resend.emails.send({
      from: getFromAddress(),
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Customer confirmation failed:", error);
      return { success: false, error: error.message };
    }

    console.log(
      `[email] Customer confirmation sent → ${data.customerEmail} (id: ${result?.id})`,
    );
    return { success: true, messageId: result?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Customer confirmation exception:", msg);
    return { success: false, error: msg };
  }
}

async function sendAdminNotification(
  data: BookingEmailData,
): Promise<EmailResult> {
  try {
    const { subject, html } = buildAdminNotificationEmail(data);
    const resend = getResend();

    const { data: result, error } = await resend.emails.send({
      from: getFromAddress(),
      to: getAdminAddress(),
      subject,
      html,
      replyTo: data.customerEmail,
    });

    if (error) {
      console.error("[email] Admin notification failed:", error);
      return { success: false, error: error.message };
    }

    console.log(
      `[email] Admin notification sent → ${getAdminAddress()} (id: ${result?.id})`,
    );
    return { success: true, messageId: result?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Admin notification exception:", msg);
    return { success: false, error: msg };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
// Sends customer confirmation + admin notification in parallel.
// Neither failure throws — errors are returned and logged.
// Use .then() in server actions so email never blocks or rolls back a booking.

export async function sendBookingEmails(
  data: BookingEmailData,
): Promise<BookingEmailResults> {
  console.log(`[email] Sending booking emails for bookingId=${data.bookingId}`);

  const [customer, admin] = await Promise.allSettled([
    sendCustomerConfirmation(data),
    sendAdminNotification(data),
  ]);

  const customerResult: EmailResult =
    customer.status === "fulfilled"
      ? customer.value
      : {
          success: false,
          error: customer.reason?.message ?? "Promise rejected",
        };

  const adminResult: EmailResult =
    admin.status === "fulfilled"
      ? admin.value
      : { success: false, error: admin.reason?.message ?? "Promise rejected" };

  if (!customerResult.success) {
    console.warn(
      `[email] Customer email failed for booking ${data.bookingId}: ${customerResult.error}`,
    );
  }
  if (!adminResult.success) {
    console.warn(
      `[email] Admin email failed for booking ${data.bookingId}: ${adminResult.error}`,
    );
  }

  return { customer: customerResult, admin: adminResult };
}

// ── Payment event emails ──────────────────────────────────────────────────────
// Re-exported from paymentEmails.ts so callers only need one import.
export {
  sendPaymentFailedEmail,
  sendSubscriptionEndedEmail,
} from "./paymentEmails";
