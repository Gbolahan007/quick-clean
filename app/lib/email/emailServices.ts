import { Resend } from "resend";
import { buildCustomerConfirmationEmail } from "../email/templates/customerConfirmation";
import { buildAdminNotificationEmail } from "../email/templates/adminNotification";
import type {
  BookingEmailData,
  BookingEmailResults,
  EmailResult,
} from "../email/types";

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

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "QuickClean <no-reply@quickclean.fi>";
}

function getAdminAddress(): string {
  return process.env.EMAIL_ADMIN ?? "hello@quickclean.fi";
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
