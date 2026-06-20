// app/lib/email/paymentEmails.ts
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 9: Email notifications for payment lifecycle events.
// Extends the existing emailService.ts — does not replace it.
// All payment event emails go through the same Resend SDK singleton.
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from "resend";

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
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM env var is not set");
  return from;
}

function getAdminAddress(): string {
  const admin = process.env.EMAIL_ADMIN;
  if (!admin) throw new Error("EMAIL_ADMIN env var is not set");
  return admin;
}

// ── Payment failed email ──────────────────────────────────────────────────────
// Sent to customer when invoice.payment_failed fires.
// Stripe will retry automatically, so this is a heads-up — not a cancellation notice.

export async function sendPaymentFailedEmail(input: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  failureReason: string;
}) {
  const resend = getResend();

  const subject = "Action required — your Frosh payment failed";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f6f4;padding:32px 16px;margin:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr>
      <td style="background:#0a1628;padding:24px 28px">
        <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff">Frosh</p>
      </td>
    </tr>
    <tr>
      <td style="background:#fef2f2;border-bottom:2px solid #fecaca;padding:12px 28px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#b91c1c">⚠ Payment could not be processed</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px">
        <p style="margin:0 0 16px;font-size:15px;color:#0a1628">Hi ${input.customerName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6">
          We weren't able to process your most recent payment for your cleaning subscription.
        </p>
        <div style="background:#f9fafb;border-left:3px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px">
          <p style="margin:0;font-size:13px;color:#374151;font-style:italic">"${input.failureReason}"</p>
        </div>
        <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6">
          We'll automatically retry your payment over the next few days. 
          To avoid service interruption, please ensure your payment method is up to date.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
          If you have questions, reply to this email or contact us at 
          <a href="mailto:hello@frosh.fi" style="color:#7c9885">hello@frosh.fi</a>.
        </p>
        <p style="margin:0;font-size:13px;color:#6b7280">
          Booking ref: <span style="font-weight:600;font-family:monospace">${input.bookingId.slice(0, 8).toUpperCase()}</span>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f8faf9;border-top:1px solid #e9ede9;padding:14px 28px">
        <p style="margin:0;font-size:11px;color:#9ca3af">Frosh · Tampere, Finland · hello@frosh.fi</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const [customerResult, adminResult] = await Promise.allSettled([
    resend.emails.send({
      from: getFromAddress(),
      to: input.customerEmail,
      subject,
      html,
    }),
    resend.emails.send({
      from: getFromAddress(),
      to: getAdminAddress(),
      subject: `[Admin] Payment failed — booking ${input.bookingId.slice(0, 8).toUpperCase()}`,
      html: `<p>Payment failed for customer <strong>${input.customerName}</strong> (${input.customerEmail}).</p>
             <p>Reason: ${input.failureReason}</p>
             <p>Booking: ${input.bookingId}</p>`,
    }),
  ]);

  if (customerResult.status === "rejected") {
    console.error("[email] Payment failed email error:", customerResult.reason);
  }
  if (adminResult.status === "rejected") {
    console.error(
      "[email] Payment failed admin email error:",
      adminResult.reason,
    );
  }
}

// ── Subscription ended email ──────────────────────────────────────────────────
// Sent to customer when customer.subscription.deleted fires.

export async function sendSubscriptionEndedEmail(input: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
}) {
  const resend = getResend();

  const subject = "Your Frosh subscription has ended";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f6f4;padding:32px 16px;margin:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr>
      <td style="background:#0a1628;padding:24px 28px">
        <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff">Frosh</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px">
        <p style="margin:0 0 16px;font-size:15px;color:#0a1628">Hi ${input.customerName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6">
          Your Frosh cleaning subscription has now ended. We hope you enjoyed the service.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
          If you'd like to restart your subscription or try a different plan, 
          you can book again at any time at 
          <a href="https://frosh.fi/pricing" style="color:#7c9885">frosh.fi/pricing</a>.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
          Questions? Reach us at 
          <a href="mailto:hello@frosh.fi" style="color:#7c9885">hello@frosh.fi</a>.
        </p>
        <p style="margin:0;font-size:13px;color:#6b7280">
          Booking ref: <span style="font-weight:600;font-family:monospace">${input.bookingId.slice(0, 8).toUpperCase()}</span>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f8faf9;border-top:1px solid #e9ede9;padding:14px 28px">
        <p style="margin:0;font-size:11px;color:#9ca3af">Frosh · Tampere, Finland · hello@frosh.fi</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: getFromAddress(),
    to: input.customerEmail,
    subject,
    html,
  });
}
