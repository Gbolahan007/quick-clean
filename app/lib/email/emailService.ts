import { Resend } from "resend";
import type { EmailResult, BookingEmailResults } from "./types";
import type {
  BookingSubmittedEmailInput,
  PaymentSuccessEmailInput,
  SubscriptionActivatedEmailInput,
  RenewalSuccessEmailInput,
  SubscriptionCancelledEmailInput,
  RefundEmailInput,
} from "./types";
import {
  buildBookingSubmittedEmail,
  buildPaymentSuccessEmail,
  buildSubscriptionActivatedEmail,
  buildRenewalSuccessEmail,
  buildSubscriptionCancelledEmail,
  buildRefundEmail,
} from "./templates/customerEmails";
import {
  buildAdminBookingSubmittedEmail,
  buildAdminPaymentReceivedEmail,
  buildAdminSubscriptionActivatedEmail,
  buildAdminRenewalEmail,
  buildAdminCancellationEmail,
  buildAdminRefundEmail,
} from "./templates/adminEmails";

// ── Resend singleton ──────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
    console.log("[email] Resend client initialized");
  }
  return _resend;
}

function getFrom(): string {
  const v = process.env.EMAIL_FROM;
  if (!v) throw new Error("EMAIL_FROM env var is not set");
  return v;
}

function getAdmin(): string {
  const v = process.env.EMAIL_ADMIN;
  if (!v) throw new Error("EMAIL_ADMIN env var is not set");
  return v;
}

// ── Low-level send ────────────────────────────────────────────────────────────

async function send(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<EmailResult> {
  const from = getFrom();

  // Explicit opt-in only — uncomment DEV_EMAIL_OVERRIDE in .env to redirect everything to one inbox.
  const override = process.env.DEV_EMAIL_OVERRIDE;
  const actualTo = override || to;
  const actualSubject =
    override && override !== to ? `[DEV → ${to}] ${subject}` : subject;

  console.log(
    `[email] Sending → to: ${actualTo} | subject: ${actualSubject} | from: ${from}`,
  );

  try {
    const { data, error } = await getResend().emails.send({
      from,
      to: actualTo,
      subject: actualSubject,
      html,
      ...(replyTo && { replyTo }),
    });

    if (error) {
      console.error(
        `[email] Resend API error → to: ${actualTo} | error:`,
        error,
      );
      return { success: false, error: error.message };
    }

    console.log(`[email] Sent ✓ → id: ${data?.id} | to: ${actualTo}`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[email] send() exception → to: ${actualTo} | error:`, msg);
    return { success: false, error: msg };
  }
}

async function sendPair(
  customerTo: string,
  customerSubject: string,
  customerHtml: string,
  adminSubject: string,
  adminHtml: string,
  customerEmail: string,
): Promise<BookingEmailResults> {
  const adminTo = getAdmin();
  console.log(`[email] sendPair → customer: ${customerTo} | admin: ${adminTo}`);

  const [customer, admin] = await Promise.allSettled([
    send(customerTo, customerSubject, customerHtml),
    send(adminTo, adminSubject, adminHtml, customerEmail),
  ]);

  const cr: EmailResult =
    customer.status === "fulfilled"
      ? customer.value
      : {
          success: false,
          error: customer.reason?.message ?? "Promise rejected",
        };

  const ar: EmailResult =
    admin.status === "fulfilled"
      ? admin.value
      : { success: false, error: admin.reason?.message ?? "Promise rejected" };

  if (!cr.success) console.error(`[email] Customer send failed:`, cr.error);
  if (!ar.success) console.error(`[email] Admin send failed:`, ar.error);

  return { customer: cr, admin: ar };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SEND FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function sendBookingSubmittedEmails(
  input: BookingSubmittedEmailInput & {
    customerPhone?: string;
    streetAddress: string;
    city: string;
  },
): Promise<BookingEmailResults> {
  console.log(
    `[email] sendBookingSubmittedEmails → bookingId: ${input.bookingId} | customer: ${input.customerEmail}`,
  );

  let customer: { subject: string; html: string };
  let admin: { subject: string; html: string };

  try {
    customer = buildBookingSubmittedEmail(input);
    console.log(
      `[email] buildBookingSubmittedEmail ✓ subject: ${customer.subject}`,
    );
  } catch (err) {
    console.error("[email] buildBookingSubmittedEmail failed:", err);
    return {
      customer: { success: false, error: String(err) },
      admin: { success: false, error: "template error" },
    };
  }

  try {
    admin = buildAdminBookingSubmittedEmail(input);
    console.log(
      `[email] buildAdminBookingSubmittedEmail ✓ subject: ${admin.subject}`,
    );
  } catch (err) {
    console.error("[email] buildAdminBookingSubmittedEmail failed:", err);
    return {
      customer: { success: false, error: "template error" },
      admin: { success: false, error: String(err) },
    };
  }

  const result = await sendPair(
    input.customerEmail,
    customer.subject,
    customer.html,
    admin.subject,
    admin.html,
    input.customerEmail,
  );

  console.log(
    `[email] sendBookingSubmittedEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error} | admin: ${result.admin.success ? "✓" : "✗ " + result.admin.error}`,
  );
  return result;
}

export async function sendPaymentSuccessEmails(
  input: PaymentSuccessEmailInput & { customerPhone?: string },
): Promise<BookingEmailResults> {
  console.log(
    `[email] sendPaymentSuccessEmails → bookingId: ${input.bookingId}`,
  );

  const customer = buildPaymentSuccessEmail(input);
  const admin = buildAdminPaymentReceivedEmail(input);

  const result = await sendPair(
    input.customerEmail,
    customer.subject,
    customer.html,
    admin.subject,
    admin.html,
    input.customerEmail,
  );

  console.log(
    `[email] sendPaymentSuccessEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error}`,
  );
  return result;
}

export async function sendSubscriptionActivatedEmails(
  input: SubscriptionActivatedEmailInput & { customerPhone?: string },
): Promise<BookingEmailResults> {
  console.log(
    `[email] sendSubscriptionActivatedEmails → bookingId: ${input.bookingId}`,
  );

  const customer = buildSubscriptionActivatedEmail(input);
  const admin = buildAdminSubscriptionActivatedEmail(input);

  const result = await sendPair(
    input.customerEmail,
    customer.subject,
    customer.html,
    admin.subject,
    admin.html,
    input.customerEmail,
  );

  console.log(
    `[email] sendSubscriptionActivatedEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error}`,
  );
  return result;
}

export async function sendRenewalSuccessEmails(
  input: RenewalSuccessEmailInput & { customerName: string },
): Promise<BookingEmailResults> {
  console.log(
    `[email] sendRenewalSuccessEmails → bookingId: ${input.bookingId}`,
  );

  const customer = buildRenewalSuccessEmail(input);
  const admin = buildAdminRenewalEmail(input);

  const result = await sendPair(
    input.customerEmail,
    customer.subject,
    customer.html,
    admin.subject,
    admin.html,
    input.customerEmail,
  );

  console.log(
    `[email] sendRenewalSuccessEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error}`,
  );
  return result;
}

export async function sendPaymentFailedEmails(input: {
  locale: "en" | "fi";
  bookingId: string;
  customerEmail: string;
  customerName: string;
  planLabel: string;
  failureReason: string;
}): Promise<BookingEmailResults> {
  console.log(
    `[email] sendPaymentFailedEmails → bookingId: ${input.bookingId}`,
  );

  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject =
    input.locale === "fi"
      ? "Maksu epäonnistui — toimenpide vaaditaan"
      : "Payment Failed — Action Required";
  const adminSubject = `[Admin] Payment failed #${ref} — ${input.customerName}`;
  const html = buildPaymentFailedHtml(input);
  const adminHtml = `
    <p>Payment failed for <strong>${input.customerName}</strong> (${input.customerEmail}).</p>
    <p>Plan: ${input.planLabel}</p>
    <p>Reason: ${input.failureReason}</p>
    <p>Booking: ${input.bookingId}</p>
    <p>Stripe will retry automatically. Monitor in <a href="https://dashboard.stripe.com">Stripe Dashboard</a>.</p>
  `;

  const result = await sendPair(
    input.customerEmail,
    subject,
    html,
    adminSubject,
    adminHtml,
    input.customerEmail,
  );

  console.log(
    `[email] sendPaymentFailedEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error}`,
  );
  return result;
}

function buildPaymentFailedHtml(input: {
  customerName: string;
  bookingId: string;
  failureReason: string;
  planLabel: string;
}): string {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,sans-serif;background:#f4f6f4;padding:32px 16px;margin:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#0a1628;padding:24px 28px"><p style="margin:0;font-size:18px;font-weight:800;color:#fff">Frosh</p></td></tr>
    <tr><td style="background:#fef2f2;border-bottom:2px solid #fecaca;padding:12px 28px">
      <p style="margin:0;font-size:13px;font-weight:700;color:#b91c1c">⚠ Payment could not be processed</p>
    </td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px;font-size:15px;color:#0a1628">Hi ${input.customerName},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6">We weren't able to process your payment for <strong>${input.planLabel}</strong>.</p>
      <div style="background:#f9fafb;border-left:3px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px">
        <p style="margin:0;font-size:13px;color:#374151;font-style:italic">"${input.failureReason}"</p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6">We'll retry automatically.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">Ref: <strong style="font-family:monospace">#${ref}</strong></p>
    </td></tr>
    <tr><td style="background:#f8faf9;border-top:1px solid #e9ede9;padding:14px 28px">
      <p style="margin:0;font-size:11px;color:#9ca3af">Frosh · Tampere · hello@frosh.fi</p>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendSubscriptionCancelledEmails(
  input: SubscriptionCancelledEmailInput,
): Promise<BookingEmailResults> {
  console.log(
    `[email] sendSubscriptionCancelledEmails → bookingId: ${input.bookingId}`,
  );

  const customer = buildSubscriptionCancelledEmail(input);
  const admin = buildAdminCancellationEmail(input);

  const result = await sendPair(
    input.customerEmail,
    customer.subject,
    customer.html,
    admin.subject,
    admin.html,
    input.customerEmail,
  );

  console.log(
    `[email] sendSubscriptionCancelledEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error}`,
  );
  return result;
}

export async function sendRefundEmails(
  input: RefundEmailInput & { customerName: string },
): Promise<BookingEmailResults> {
  console.log(`[email] sendRefundEmails → bookingId: ${input.bookingId}`);

  const customer = buildRefundEmail(input);
  const admin = buildAdminRefundEmail(input);

  const result = await sendPair(
    input.customerEmail,
    customer.subject,
    customer.html,
    admin.subject,
    admin.html,
    input.customerEmail,
  );

  console.log(
    `[email] sendRefundEmails done → customer: ${result.customer.success ? "✓" : "✗ " + result.customer.error}`,
  );
  return result;
}

// ── Backward compat re-exports ────────────────────────────────────────────────

export async function sendPaymentFailedEmail(input: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  failureReason: string;
}) {
  return sendPaymentFailedEmails({ ...input, locale: "en", planLabel: "" });
}

export async function sendSubscriptionEndedEmail(input: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
}) {
  return sendSubscriptionCancelledEmails({
    ...input,
    locale: "en",
    planLabel: "",
    canceledAt: new Date().toISOString(),
    accessUntil: null,
  });
}
