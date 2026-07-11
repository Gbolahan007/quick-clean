import type {
  BookingSubmittedEmailInput,
  PaymentSuccessEmailInput,
  RefundEmailInput,
  RenewalSuccessEmailInput,
  SubscriptionActivatedEmailInput,
  SubscriptionCancelledEmailInput,
} from "../types";
import {
  BRAND,
  adminDiscountBlock,
  ctaButton,
  detailRow,
  detailSection,
  emailBanner,
  emailFooter,
  emailWrapper,
  formatAmount,
} from "./emailLayout";

// ── Shared admin header ───────────────────────────────────────────────────────
function adminHeader(title: string, bookingId: string): string {
  const ref = bookingId.slice(0, 8).toUpperCase();
  return `
  <tr>
    <td style="background:${BRAND.dark};padding:20px 28px;border-bottom:3px solid ${BRAND.green}">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>
          <p style="margin:0;font-size:12px;font-weight:800;color:${BRAND.green};text-transform:uppercase;letter-spacing:1px">Frosh — Admin</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:${BRAND.white}">${title}</p>
        </td>
        <td align="right">
          <div style="background:${BRAND.green};border-radius:8px;padding:7px 13px;display:inline-block">
            <p style="margin:0;font-size:11px;font-weight:700;color:${BRAND.white};text-transform:uppercase;letter-spacing:1px">Ref #${ref}</p>
          </div>
        </td>
      </tr></table>
    </td>
  </tr>`;
}

function dashboardLink(bookingId: string): string {
  return `
  <tr><td style="padding:20px 28px 28px">
    ${ctaButton("View in dashboard →", `https://frosh.fi/admin/bookings/${bookingId}`)}
  </td></tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NEW BOOKING SUBMITTED
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdminBookingSubmittedEmail(
  input: BookingSubmittedEmailInput & {
    customerPhone?: string;
    streetAddress: string;
    city: string;
  },
): { subject: string; html: string } {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject = `[Admin] New booking #${ref} — ${input.serviceType} · ${input.bookingDate}`;

  const body = `
    ${adminHeader("New Booking Received", input.bookingId)}
    ${emailBanner("⚡ New booking submitted — assign a cleaner in the dashboard", "warning")}
    <tr><td style="padding:24px 28px 0">
      ${detailSection(
        "Booking",
        `
        ${detailRow("Booking ID", input.bookingId, true)}
        ${detailRow("Service", input.serviceType)}
        ${detailRow("Plan", input.planLabel)}
        ${detailRow("Apartment", input.apartmentSize)}
        ${detailRow("Frequency", input.frequency)}
        ${detailRow("Preferred date", input.bookingDate, true)}
        ${detailRow("Preferred time", input.timeSlot)}
        ${detailRow("Amount due", formatAmount(Math.round(input.finalPrice * 100)))}
      `,
      )}
      ${detailSection(
        "Customer",
        `
        ${detailRow("Name", input.customerName, true)}
        ${detailRow("Email", `<a href="mailto:${input.customerEmail}" style="color:${BRAND.green}">${input.customerEmail}</a>`)}
        ${input.customerPhone ? detailRow("Phone", input.customerPhone) : ""}
        ${detailRow("Locale", input.locale.toUpperCase())}
      `,
      )}
      ${detailSection(
        "Address",
        `
        ${detailRow("Street", input.streetAddress)}
        ${detailRow("City", input.city)}
      `,
      )}
    </td></tr>
    ${dashboardLink(input.bookingId)}
    ${emailFooter(`Booking ID: ${input.bookingId}`)}
  `;

  return { subject, html: emailWrapper(body, "580px") };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PAYMENT RECEIVED (one-time)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdminPaymentReceivedEmail(
  input: PaymentSuccessEmailInput & { customerPhone?: string },
): { subject: string; html: string } {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject = `[Admin] Payment received #${ref} — ${formatAmount(input.amountCents, input.currency)}`;

  const paidDate = new Date(input.paidAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const body = `
    ${adminHeader("Payment Received", input.bookingId)}
    ${emailBanner("✓ One-time payment confirmed", "success")}
    <tr><td style="padding:24px 28px 0">
      ${detailSection(
        "Payment",
        `
        ${detailRow("Booking ID", input.bookingId, true)}
        ${detailRow("Amount charged", formatAmount(input.amountCents, input.currency), true)}
        ${detailRow("Paid on", paidDate)}
        ${detailRow("Payment Intent", input.stripePaymentIntentId)}
        ${detailRow("Service", input.serviceType)}
        ${detailRow("Date", input.bookingDate)}
      `,
      )}
      ${detailSection(
        "Customer",
        `
        ${detailRow("Name", input.customerName, true)}
        ${detailRow("Email", `<a href="mailto:${input.customerEmail}" style="color:${BRAND.green}">${input.customerEmail}</a>`)}
        ${input.customerPhone ? detailRow("Phone", input.customerPhone) : ""}
      `,
      )}
    </td></tr>
    ${adminDiscountBlock({
      isFirstBooking: input.isFirstBooking,
      discountSource: input.discountSource,
      discountAmountCents: input.discountAmountCents,
      originalAmountCents: input.originalAmountCents,
      chargedCents: input.amountCents,
    })}
    ${dashboardLink(input.bookingId)}
    ${emailFooter()}
  `;

  return { subject, html: emailWrapper(body, "580px") };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUBSCRIPTION ACTIVATED
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdminSubscriptionActivatedEmail(
  input: SubscriptionActivatedEmailInput & {
    customerPhone?: string;
    customerName: string;
  },
): { subject: string; html: string } {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject = `[Admin] New subscription #${ref} — ${input.planLabel}`;

  const body = `
    ${adminHeader("New Subscription Activated", input.bookingId)}
    ${emailBanner("✓ Subscription activated — recurring billing started", "success")}
    <tr><td style="padding:24px 28px 0">
      ${detailSection(
        "Subscription",
        `
        ${detailRow("Booking ID", input.bookingId, true)}
        ${detailRow("Plan", input.planLabel, true)}
        ${detailRow("Frequency", input.frequency)}
        ${detailRow("Visits/month", input.visitsPerMonth ? `${input.visitsPerMonth}` : "—")}
        ${detailRow("Monthly amount", formatAmount(input.amountCents, input.currency))}
        ${detailRow("Subscription ID", input.stripeSubscriptionId)}
      `,
      )}
      ${detailSection(
        "Customer",
        `
        ${detailRow("Name", input.customerName, true)}
        ${detailRow("Email", `<a href="mailto:${input.customerEmail}" style="color:${BRAND.green}">${input.customerEmail}</a>`)}
        ${input.customerPhone ? detailRow("Phone", input.customerPhone) : ""}
      `,
      )}
    </td></tr>
    ${adminDiscountBlock({
      isFirstBooking: input.isFirstBooking,
      discountSource: input.discountSource,
      discountAmountCents: input.discountAmountCents,
      originalAmountCents: input.originalAmountCents,
      chargedCents: input.amountCents,
    })}
    ${dashboardLink(input.bookingId)}
    ${emailFooter()}
  `;

  return { subject, html: emailWrapper(body, "580px") };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RENEWAL SUCCESSFUL (admin copy)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdminRenewalEmail(
  input: RenewalSuccessEmailInput & {
    customerName: string;
    customerEmail: string;
  },
): { subject: string; html: string } {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject = `[Admin] Renewal #${ref} — ${formatAmount(input.amountCents, input.currency)}`;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const body = `
    ${adminHeader("Subscription Renewed", input.bookingId)}
    ${emailBanner("✓ Monthly renewal payment collected", "success")}
    <tr><td style="padding:24px 28px 0">
      ${detailSection(
        "Renewal",
        `
        ${detailRow("Booking ID", input.bookingId, true)}
        ${detailRow("Plan", input.planLabel)}
        ${detailRow("Amount", formatAmount(input.amountCents, input.currency), true)}
        ${detailRow("Period", `${fmt(input.billingPeriodStart)} – ${fmt(input.billingPeriodEnd)}`)}
        ${detailRow("Invoice ID", input.stripeInvoiceId)}
        ${detailRow("Customer", input.customerName)}
        ${detailRow("Email", input.customerEmail)}
      `,
      )}
    </td></tr>
    ${emailFooter()}
  `;

  return { subject, html: emailWrapper(body, "580px") };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUBSCRIPTION CANCELLED (admin copy)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdminCancellationEmail(
  input: SubscriptionCancelledEmailInput & { customerEmail: string },
): { subject: string; html: string } {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject = `[Admin] Subscription cancelled #${ref} — ${input.customerName}`;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const body = `
    ${adminHeader("Subscription Cancelled", input.bookingId)}
    ${emailBanner("Subscription has ended — no further charges", "info")}
    <tr><td style="padding:24px 28px 0">
      ${detailSection(
        "Cancellation",
        `
        ${detailRow("Booking ID", input.bookingId, true)}
        ${detailRow("Plan", input.planLabel)}
        ${detailRow("Cancelled on", fmt(input.canceledAt))}
        ${input.accessUntil ? detailRow("Service until", fmt(input.accessUntil)) : ""}
        ${detailRow("Customer", input.customerName, true)}
        ${detailRow("Email", `<a href="mailto:${input.customerEmail}" style="color:${BRAND.green}">${input.customerEmail}</a>`)}
      `,
      )}
    </td></tr>
    ${dashboardLink(input.bookingId)}
    ${emailFooter()}
  `;

  return { subject, html: emailWrapper(body, "580px") };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. REFUND ISSUED (admin copy)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdminRefundEmail(
  input: RefundEmailInput & { customerName: string },
): { subject: string; html: string } {
  const ref = input.bookingId.slice(0, 8).toUpperCase();
  const subject = `[Admin] Refund issued #${ref} — ${formatAmount(input.refundAmountCents, input.currency)}`;

  const refundDate = new Date(input.refundedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const body = `
    ${adminHeader("Refund Issued", input.bookingId)}
    ${emailBanner(`${input.isFullRefund ? "Full" : "Partial"} refund processed`, "warning")}
    <tr><td style="padding:24px 28px 0">
      ${detailSection(
        "Refund",
        `
        ${detailRow("Booking ID", input.bookingId, true)}
        ${detailRow("Amount", formatAmount(input.refundAmountCents, input.currency), true)}
        ${detailRow("Refund date", refundDate)}
        ${detailRow("Type", input.isFullRefund ? "Full refund" : "Partial refund")}
        ${detailRow("Refund ID", input.stripeRefundId)}
        ${detailRow("Customer", input.customerName)}
        ${detailRow("Email", `<a href="mailto:${input.customerEmail}" style="color:${BRAND.green}">${input.customerEmail}</a>`)}
      `,
      )}
    </td></tr>
    ${dashboardLink(input.bookingId)}
    ${emailFooter()}
  `;

  return { subject, html: emailWrapper(body, "580px") };
}
