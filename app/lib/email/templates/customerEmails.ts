import type {
  BookingSubmittedEmailInput,
  EmailLocale,
  PaymentSuccessEmailInput,
  RefundEmailInput,
  RenewalSuccessEmailInput,
  SubscriptionActivatedEmailInput,
  SubscriptionCancelledEmailInput,
} from "../types";
import {
  BRAND,
  detailRow,
  detailSection,
  discountBlock,
  emailBanner,
  emailFooter,
  emailHeader,
  emailWrapper,
  formatAmount,
  refBadge,
} from "./emailLayout";

// ── i18n copy ─────────────────────────────────────────────────────────────────

const T = {
  en: {
    bookingSubmitted: {
      subject: "Booking Request Received — Frosh",
      banner: "We've received your booking request",
      heading: (name: string) => `Hi ${name},`,
      intro:
        "Thanks for choosing Frosh. We've received your booking request and it's awaiting payment.",
      detailsTitle: "Booking details",
      fields: {
        ref: "Booking ref",
        service: "Service",
        plan: "Plan",
        apt: "Apartment",
        date: "Preferred date",
        time: "Preferred time",
        price: "Amount due",
      },
      paymentNote:
        "Your booking will be confirmed once payment is completed. You'll receive a separate confirmation email after payment.",
      cta: "Complete payment →",
      sign: "See you soon — The Frosh team",
    },
    paymentSuccess: {
      subject: "Payment Received — Your Booking Is Confirmed",
      banner: "Payment received — booking confirmed",
      heading: (name: string) => `Hi ${name}, you're all set!`,
      intro: "Your payment was successful and your booking is now confirmed.",
      fields: {
        ref: "Booking ref",
        service: "Service",
        date: "Date",
        time: "Time",
        paid: "Amount paid",
        paidOn: "Payment date",
        status: "Status",
      },
      status: "Confirmed ✓",
      sign: "Enjoy your clean home. — The Frosh team",
    },
    subscriptionActivated: {
      subject: "Your Cleaning Subscription Is Active",
      banner: "Subscription activated",
      heading: (name: string) => `Welcome, ${name}!`,
      intro:
        "Your Frosh subscription is now active. Here's a summary of your plan.",
      fields: {
        ref: "Booking ref",
        plan: "Plan",
        frequency: "Frequency",
        visits: "Visits per month",
        firstBilling: "First billing date",
        amount: "Monthly charge",
        status: "Status",
      },
      status: "Active ✓",
      visitsLabel: (n: number) => `${n} visit${n !== 1 ? "s" : ""} per month`,
      sign: "Looking forward to keeping your home spotless. — The Frosh team",
    },
    renewal: {
      subject: "Subscription Renewal Successful",
      banner: "Your subscription has renewed",
      heading: (name: string) => `Hi ${name},`,
      intro:
        "Your monthly cleaning subscription has been renewed successfully.",
      fields: {
        ref: "Booking ref",
        plan: "Plan",
        amount: "Amount charged",
        period: "Billing period",
        visits: "Visits this period",
      },
      sign: "See you soon — The Frosh team",
    },
    cancelled: {
      subject: "Your Frosh Subscription Has Ended",
      banner: "Subscription ended",
      heading: (name: string) => `Hi ${name},`,
      intro:
        "Your Frosh cleaning subscription has ended. We hope you enjoyed the service.",
      fields: {
        ref: "Booking ref",
        plan: "Plan",
        canceledOn: "Cancelled on",
        accessUntil: "Service continues until",
      },
      outro:
        "You can restart your subscription or book a one-time clean any time at",
      sign: "Thank you for choosing Frosh. — The Frosh team",
    },
    refund: {
      subject: "Refund Processed — Frosh",
      banner: "Your refund has been processed",
      heading: (name: string) => `Hi ${name},`,
      intro: "We've processed a refund for your booking.",
      fields: {
        ref: "Booking ref",
        amount: "Refund amount",
        date: "Refund date",
        type: "Refund type",
      },
      fullRefund: "Full refund",
      partialRefund: "Partial refund",
      note: "Refunds typically appear in your account within 5–10 business days depending on your bank.",
      sign: "If you have any questions, contact us at hello@frosh.fi. — The Frosh team",
    },
  },
  fi: {
    bookingSubmitted: {
      subject: "Varaukset vastaanotettu — Frosh",
      banner: "Olemme vastaanottaneet varauksesi",
      heading: (name: string) => `Hei ${name},`,
      intro:
        "Kiitos, että valitsit Froshin. Olemme vastaanottaneet varauspyyntösi. Se odottaa maksua.",
      detailsTitle: "Varauksen tiedot",
      fields: {
        ref: "Varausnumero",
        service: "Palvelu",
        plan: "Paketti",
        apt: "Asunto",
        date: "Toivottu päivä",
        time: "Toivottu aika",
        price: "Maksettava summa",
      },
      paymentNote:
        "Varauksesi vahvistetaan maksun jälkeen. Saat erillisen vahvistussähköpostin maksamisen jälkeen.",
      cta: "Siirry maksamaan →",
      sign: "Nähdään pian — Frosh-tiimi",
    },
    paymentSuccess: {
      subject: "Maksu vastaanotettu — Varauksesi on vahvistettu",
      banner: "Maksu vastaanotettu — varaus vahvistettu",
      heading: (name: string) => `Hei ${name}, kaikki on valmista!`,
      intro: "Maksusi onnistui ja varauksesi on nyt vahvistettu.",
      fields: {
        ref: "Varausnumero",
        service: "Palvelu",
        date: "Päivä",
        time: "Aika",
        paid: "Maksettu summa",
        paidOn: "Maksupäivä",
        status: "Tila",
      },
      status: "Vahvistettu ✓",
      sign: "Nauti puhtaasta kodistasi. — Frosh-tiimi",
    },
    subscriptionActivated: {
      subject: "Siivoustilauspalvelusi on aktiivinen",
      banner: "Tilaus aktivoitu",
      heading: (name: string) => `Tervetuloa, ${name}!`,
      intro:
        "Frosh-tilauksesi on nyt aktiivinen. Tässä yhteenveto paketistasi.",
      fields: {
        ref: "Varausnumero",
        plan: "Paketti",
        frequency: "Taajuus",
        visits: "Käyntejä per kuukausi",
        firstBilling: "Ensimmäinen laskutuspäivä",
        amount: "Kuukausimaksu",
        status: "Tila",
      },
      status: "Aktiivinen ✓",
      visitsLabel: (n: number) =>
        `${n} käynti${n !== 1 ? "ä" : ""} kuukaudessa`,
      sign: "Pidämme kotisi siistinä. — Frosh-tiimi",
    },
    renewal: {
      subject: "Tilausuusinta onnistui",
      banner: "Tilauksesi on uusittu",
      heading: (name: string) => `Hei ${name},`,
      intro: "Kuukausittainen siivoustilauspalvelusi on uusittu onnistuneesti.",
      fields: {
        ref: "Varausnumero",
        plan: "Paketti",
        amount: "Veloitettu summa",
        period: "Laskutuskausi",
        visits: "Käynnit tällä kaudella",
      },
      sign: "Nähdään pian — Frosh-tiimi",
    },
    cancelled: {
      subject: "Frosh-tilauksesi on päättynyt",
      banner: "Tilaus päättynyt",
      heading: (name: string) => `Hei ${name},`,
      intro:
        "Frosh-siivoustilauspalvelusi on päättynyt. Toivomme, että olet ollut tyytyväinen palveluumme.",
      fields: {
        ref: "Varausnumero",
        plan: "Paketti",
        canceledOn: "Peruutettu",
        accessUntil: "Palvelu jatkuu",
      },
      outro:
        "Voit aloittaa tilauksen uudelleen tai varata kertaluonteisen siivouksen milloin tahansa osoitteessa",
      sign: "Kiitos, että valitsit Froshin. — Frosh-tiimi",
    },
    refund: {
      subject: "Hyvitys käsitelty — Frosh",
      banner: "Hyvityksesi on käsitelty",
      heading: (name: string) => `Hei ${name},`,
      intro: "Olemme käsitelleet hyvityksen varauksestasi.",
      fields: {
        ref: "Varausnumero",
        amount: "Hyvityksen määrä",
        date: "Hyvityspäivä",
        type: "Hyvitystyyppi",
      },
      fullRefund: "Täysi hyvitys",
      partialRefund: "Osahyvitys",
      note: "Hyvitykset näkyvät tilillä yleensä 5–10 pankkipäivän kuluessa.",
      sign: "Jos sinulla on kysyttävää, ota yhteyttä osoitteessa hello@frosh.fi. — Frosh-tiimi",
    },
  },
} as const;

function t(locale: EmailLocale, key: keyof typeof T.en) {
  return (T[locale] ?? T.en)[key] as (typeof T.en)[typeof key];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BOOKING SUBMITTED
// ─────────────────────────────────────────────────────────────────────────────

export function buildBookingSubmittedEmail(input: BookingSubmittedEmailInput): {
  subject: string;
  html: string;
} {
  const c = t(input.locale, "bookingSubmitted") as typeof T.en.bookingSubmitted;

  const body = `
    ${emailHeader("Tampere, Finland")}
    ${emailBanner(c.banner, "info")}
    <tr><td style="padding:32px 32px 0">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.dark}">${c.heading(input.customerName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.text};line-height:1.6">${c.intro}</p>
      ${refBadge(input.bookingId)}
      ${detailSection(
        c.detailsTitle,
        `
        ${detailRow(c.fields.ref, input.bookingId.slice(0, 8).toUpperCase(), true)}
        ${detailRow(c.fields.service, input.serviceType)}
        ${detailRow(c.fields.plan, input.planLabel)}
        ${detailRow(c.fields.apt, input.apartmentSize)}
        ${detailRow(c.fields.date, input.bookingDate)}
        ${detailRow(c.fields.time, input.timeSlot)}
        ${detailRow(c.fields.price, formatAmount(Math.round(input.finalPrice * 100)))}
      `,
      )}
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:20px 0">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6">${c.paymentNote}</p>
      </div>
    </td></tr>
    <tr><td style="padding:20px 32px">
      <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:${BRAND.dark}">${c.sign}</p>
    </td></tr>
    ${emailFooter("This email was sent because a booking was submitted on frosh.fi.")}
  `;

  return { subject: c.subject, html: emailWrapper(body) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PAYMENT SUCCESSFUL — ONE-TIME
// ─────────────────────────────────────────────────────────────────────────────

export function buildPaymentSuccessEmail(input: PaymentSuccessEmailInput): {
  subject: string;
  html: string;
} {
  const c = t(input.locale, "paymentSuccess") as typeof T.en.paymentSuccess;

  const paidDate = new Date(input.paidAt).toLocaleDateString(
    input.locale === "fi" ? "fi-FI" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const body = `
    ${emailHeader("Tampere, Finland")}
    ${emailBanner(c.banner, "success")}
    <tr><td style="padding:32px 32px 0">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.dark}">${c.heading(input.customerName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.text};line-height:1.6">${c.intro}</p>
      ${refBadge(input.bookingId)}
      ${detailSection(
        "",
        `
        ${detailRow(c.fields.ref, input.bookingId.slice(0, 8).toUpperCase(), true)}
        ${detailRow(c.fields.service, input.serviceType)}
        ${detailRow(c.fields.date, input.bookingDate)}
        ${detailRow(c.fields.time, input.timeSlot)}
        ${detailRow(c.fields.paid, formatAmount(input.amountCents, input.currency), true)}
        ${detailRow(c.fields.paidOn, paidDate)}
        ${detailRow(c.fields.status, c.status)}
      `,
      )}
    </td></tr>
    ${discountBlock({
      discountSource: input.discountSource,
      discountAmountCents: input.discountAmountCents,
      originalAmountCents: input.originalAmountCents,
      locale: input.locale,
    })}
    <tr><td style="padding:20px 32px">
      <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.dark}">${c.sign}</p>
    </td></tr>
    ${emailFooter()}
  `;

  return { subject: c.subject, html: emailWrapper(body) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUBSCRIPTION ACTIVATED
// ─────────────────────────────────────────────────────────────────────────────

export function buildSubscriptionActivatedEmail(
  input: SubscriptionActivatedEmailInput,
): { subject: string; html: string } {
  const c = t(
    input.locale,
    "subscriptionActivated",
  ) as typeof T.en.subscriptionActivated;

  const nextBilling = input.firstBillingDate
    ? new Date(input.firstBillingDate).toLocaleDateString(
        input.locale === "fi" ? "fi-FI" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : "—";

  const visitsText = input.visitsPerMonth
    ? c.visitsLabel(input.visitsPerMonth)
    : "—";

  const body = `
    ${emailHeader("Tampere, Finland")}
    ${emailBanner(c.banner, "success")}
    <tr><td style="padding:32px 32px 0">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.dark}">${c.heading(input.customerName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.text};line-height:1.6">${c.intro}</p>
      ${refBadge(input.bookingId)}
      ${detailSection(
        "",
        `
        ${detailRow(c.fields.ref, input.bookingId.slice(0, 8).toUpperCase(), true)}
        ${detailRow(c.fields.plan, input.planLabel, true)}
        ${detailRow(c.fields.visits, visitsText)}
        ${detailRow(c.fields.amount, formatAmount(input.amountCents, input.currency))}
        ${detailRow(c.fields.firstBilling, nextBilling)}
        ${detailRow(c.fields.status, c.status)}
      `,
      )}
    </td></tr>
    ${discountBlock({
      discountSource: input.discountSource,
      discountAmountCents: input.discountAmountCents,
      originalAmountCents: input.originalAmountCents,
      locale: input.locale,
    })}
    <tr><td style="padding:20px 32px">
      <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.dark}">${c.sign}</p>
    </td></tr>
    ${emailFooter()}
  `;

  return { subject: c.subject, html: emailWrapper(body) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MONTHLY RENEWAL SUCCESSFUL
// ─────────────────────────────────────────────────────────────────────────────

export function buildRenewalSuccessEmail(input: RenewalSuccessEmailInput): {
  subject: string;
  html: string;
} {
  const c = t(input.locale, "renewal") as typeof T.en.renewal;
  const loc = input.locale === "fi" ? "fi-FI" : "en-GB";

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(loc, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const period = `${fmt(input.billingPeriodStart)} – ${fmt(input.billingPeriodEnd)}`;

  const body = `
    ${emailHeader("Tampere, Finland")}
    ${emailBanner(c.banner, "success")}
    <tr><td style="padding:32px 32px 0">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.dark}">${c.heading(input.customerName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.text};line-height:1.6">${c.intro}</p>
      ${refBadge(input.bookingId)}
      ${detailSection(
        "",
        `
        ${detailRow(c.fields.ref, input.bookingId.slice(0, 8).toUpperCase(), true)}
        ${detailRow(c.fields.plan, input.planLabel)}
        ${detailRow(c.fields.amount, formatAmount(input.amountCents, input.currency), true)}
        ${detailRow(c.fields.period, period)}
        ${input.visitsCovered ? detailRow(c.fields.visits, `${input.visitsCovered}`) : ""}
      `,
      )}
    </td></tr>
    <tr><td style="padding:20px 32px">
      <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.dark}">${c.sign}</p>
    </td></tr>
    ${emailFooter()}
  `;

  return { subject: c.subject, html: emailWrapper(body) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUBSCRIPTION CANCELLED
// ─────────────────────────────────────────────────────────────────────────────

export function buildSubscriptionCancelledEmail(
  input: SubscriptionCancelledEmailInput,
): { subject: string; html: string } {
  const c = t(input.locale, "cancelled") as typeof T.en.cancelled;
  const loc = input.locale === "fi" ? "fi-FI" : "en-GB";

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(loc, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const body = `
    ${emailHeader("Tampere, Finland")}
    ${emailBanner(c.banner, "info")}
    <tr><td style="padding:32px 32px 0">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.dark}">${c.heading(input.customerName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.text};line-height:1.6">${c.intro}</p>
      ${refBadge(input.bookingId)}
      ${detailSection(
        "",
        `
        ${detailRow(c.fields.ref, input.bookingId.slice(0, 8).toUpperCase())}
        ${detailRow(c.fields.plan, input.planLabel)}
        ${detailRow(c.fields.canceledOn, fmt(input.canceledAt))}
        ${input.accessUntil ? detailRow(c.fields.accessUntil, fmt(input.accessUntil)) : ""}
      `,
      )}
      <p style="margin:16px 0 0;font-size:13px;color:${BRAND.text};line-height:1.7">
        ${c.outro} <a href="https://frosh.fi/pricing" style="color:${BRAND.green};font-weight:600">frosh.fi/pricing</a>.
      </p>
    </td></tr>
    <tr><td style="padding:20px 32px">
      <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.dark}">${c.sign}</p>
    </td></tr>
    ${emailFooter()}
  `;

  return { subject: c.subject, html: emailWrapper(body) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. REFUND ISSUED
// ─────────────────────────────────────────────────────────────────────────────

export function buildRefundEmail(input: RefundEmailInput): {
  subject: string;
  html: string;
} {
  const c = t(input.locale, "refund") as typeof T.en.refund;
  const loc = input.locale === "fi" ? "fi-FI" : "en-GB";

  const refundDate = new Date(input.refundedAt).toLocaleDateString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const body = `
    ${emailHeader("Tampere, Finland")}
    ${emailBanner(c.banner, "info")}
    <tr><td style="padding:32px 32px 0">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.dark}">${c.heading(input.customerName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.text};line-height:1.6">${c.intro}</p>
      ${refBadge(input.bookingId)}
      ${detailSection(
        "",
        `
        ${detailRow(c.fields.ref, input.bookingId.slice(0, 8).toUpperCase())}
        ${detailRow(c.fields.amount, formatAmount(input.refundAmountCents, input.currency), true)}
        ${detailRow(c.fields.date, refundDate)}
        ${detailRow(c.fields.type, input.isFullRefund ? c.fullRefund : c.partialRefund)}
      `,
      )}
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280;line-height:1.6">${c.note}</p>
    </td></tr>
    <tr><td style="padding:20px 32px">
      <p style="margin:0;font-size:13px;color:${BRAND.text};line-height:1.6">${c.sign}</p>
    </td></tr>
    ${emailFooter()}
  `;

  return { subject: c.subject, html: emailWrapper(body) };
}
