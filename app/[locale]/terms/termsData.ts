export const LAST_UPDATED = "August 2026";

export type Block =
  | { type: "text"; content: string }
  | { type: "clause"; number: string; content: string }
  | { type: "definition"; term: string; content: string }
  | {
      type: "callout";
      variant: "info" | "warning" | "legal";
      title?: string;
      content: string;
    }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "contact"; lines: { label: string; value: string }[] };

export interface TermsSection {
  id: string;
  number: number;
  title: string;
  blocks: Block[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "about-these-terms",
    number: 1,
    title: "About These Terms",
    blocks: [
      {
        type: "clause",
        number: "1.1",
        content:
          'These Terms of Service ("Terms") govern the provision of cleaning and related services by Frosh Enterprises, Business ID 3599859-5, registered address 19 K53 Näyttelijänkatu, 33720 Tampere ("Frosh," "we," "us," "our"), operating under the trade name Frosh at frosh.fi, to any customer who books, subscribes to, or otherwise uses our services ("Customer," "you").',
      },
      {
        type: "clause",
        number: "1.2",
        content:
          "These Terms apply to both consumer Customers (private individuals acting outside a trade, business, or profession) and business Customers (companies and organizations), except where a clause is expressly stated to apply only to one category. Certain statutory rights described herein — in particular the right of withdrawal in Section 6 — apply only to consumer customers under Finnish and EU law.",
      },
      {
        type: "clause",
        number: "1.3",
        content:
          "By booking a Service, subscribing to a plan, or otherwise confirming an order through frosh.fi, by email, or verbally, you agree to these Terms.",
      },
    ],
  },
  {
    id: "definitions",
    number: 2,
    title: "Definitions",
    blocks: [
      {
        type: "definition",
        term: "Service",
        content:
          "Any cleaning or related service offered by Frosh, including home care (maintenance cleaning), workspace/office management, move-out cleaning, deep cleaning, Airbnb & short-stay turnover cleaning, post-renovation cleaning, ship & yacht cleaning, and the employee wellbeing benefit programme.",
      },
      {
        type: "definition",
        term: "Subscription",
        content:
          "A recurring Service booked on a weekly, bi-weekly, or monthly cadence.",
      },
      {
        type: "definition",
        term: "Booking",
        content:
          "A single confirmed appointment for a Service, whether standalone or part of a Subscription.",
      },
      {
        type: "definition",
        term: "Cleaner",
        content:
          "The vetted individual or team assigned by Frosh to carry out a Booking.",
      },
      {
        type: "definition",
        term: "Pilot",
        content:
          "A time-limited trial of the Service, including under the employee wellbeing benefit programme, on terms that may differ from a standard Subscription.",
      },
    ],
  },
  {
    id: "the-service",
    number: 3,
    title: "The Service",
    blocks: [
      {
        type: "clause",
        number: "3.1",
        content:
          "Description. Frosh provides the cleaning services described on frosh.fi, including the specific inclusions and exclusions listed for each service type. The scope of each visit is as set out on the relevant service page at the time of booking.",
      },
      {
        type: "clause",
        number: "3.2",
        content:
          "Same-cleaner policy. Where operationally possible, Frosh assigns the same Cleaner to a Customer's recurring Bookings. This is a service standard, not a guaranteed entitlement — illness, staffing changes, or availability may require a substitute Cleaner.",
      },
      {
        type: "clause",
        number: "3.3",
        content:
          "Vetting & insurance. All Cleaners are vetted before assignment and covered by liability insurance maintained by Frosh for performance of the Service. Coverage details are available on request.",
      },
      {
        type: "clause",
        number: "3.4",
        content:
          "Service area. Services are currently provided within Tampere and the surrounding Pirkanmaa region. Frosh may decline or reschedule a Booking outside this area, or outside normal operating hours, at its discretion.",
      },
      {
        type: "clause",
        number: "3.5",
        content:
          "Supplies & equipment. Unless otherwise agreed, Frosh provides its own cleaning supplies and equipment.",
      },
    ],
  },
  {
    id: "bookings-access",
    number: 4,
    title: "Bookings, Access & Customer Responsibilities",
    blocks: [
      {
        type: "clause",
        number: "4.1",
        content:
          "Making a booking. Bookings and Subscriptions may be made via frosh.fi, by email, or by other means Frosh makes available. A Booking is confirmed once Frosh sends a confirmation (email, SMS, or equivalent).",
      },
      {
        type: "clause",
        number: "4.2",
        content:
          "Access. The Customer is responsible for ensuring the Cleaner can safely access the property at the agreed time (e.g. by being present, providing a key, or arranging entry). If access cannot be gained through no fault of Frosh, the visit may be treated as a late cancellation under 4.4.",
      },
      {
        type: "clause",
        number: "4.3",
        content:
          "Accurate information. The Customer must provide accurate information about the property (size, condition, access instructions) and disclose in advance any hazards, fragile or high-value items, pets, or conditions relevant to the Cleaner's health and safety.",
      },
      {
        type: "clause",
        number: "4.4",
        content:
          "Rescheduling & late cancellation of a single visit. Individual visits may be rescheduled or cancelled free of charge up to 24 hours before the scheduled time. Cancellations after this window, or a missed visit due to lack of access, may incur a fee of 30% of the service charge.",
      },
    ],
  },
  {
    id: "pricing-payment",
    number: 5,
    title: "Pricing & Payment",
    blocks: [
      {
        type: "clause",
        number: "5.1",
        content:
          "Prices. All prices are quoted in EUR and include Finnish VAT at the applicable statutory rate (25.5% as of 2026, subject to change by law). Current prices are published on frosh.fi or quoted directly for bespoke/quote-based services (e.g. post-renovation, ship & yacht cleaning).",
      },
      {
        type: "clause",
        number: "5.2",
        content:
          "Household tax deduction (kotitalousvähennys). Private (non-business) Customers may be able to claim part of the labour cost of the Service under the Finnish household tax deduction scheme (kotitalousvähennys). Eligibility, percentage, and annual caps are set by Finnish tax law and change from time to time — Frosh will provide the documentation needed to support a claim but does not guarantee eligibility or the amount. Customers should confirm current terms at vero.fi.",
      },
      {
        type: "clause",
        number: "5.3",
        content:
          "Payment. Payment is due at the time of booking, or by invoice within 14 days. For Subscriptions, charges are billed monthly in advance.",
      },
      {
        type: "clause",
        number: "5.4",
        content:
          "Price changes. Frosh may change its prices. For active Subscriptions, any increase will be notified at least 60 days in advance, and the Customer may cancel before the new price takes effect without penalty.",
      },
    ],
  },
  {
    id: "right-of-withdrawal",
    number: 6,
    title: "Right of Withdrawal",
    blocks: [
      {
        type: "callout",
        variant: "info",
        title: "Applies to consumer Customers only",
        content:
          "This section sets out statutory rights available to private individuals acting outside a trade, business, or profession. Business Customers are covered by Sections 7 and 8.",
      },
      {
        type: "clause",
        number: "6.1",
        content:
          "Statutory right. If you are a consumer and booked a Service at a distance (e.g. via frosh.fi) or off-premises, you generally have the right to withdraw from the contract within 14 days of concluding it, without giving a reason, under the Finnish Consumer Protection Act (Kuluttajansuojalaki) and the EU Consumer Rights Directive (2011/83/EU).",
      },
      {
        type: "clause",
        number: "6.2",
        content:
          "Early performance during the withdrawal period. If you ask Frosh to begin the Service before the 14-day period ends, and expressly acknowledge you will lose the right of withdrawal once the Service is fully performed, that right ends once performance is complete. If only part of the Service has been delivered when you withdraw, you will be charged a proportionate amount for the part already provided.",
      },
      {
        type: "clause",
        number: "6.3",
        content:
          'How to withdraw. You may withdraw by giving Frosh a clear statement of your decision — either by sending an email to hello@frosh.fi or by using the "click to cancel" function in your user dashboard on frosh.fi — before the withdrawal period expires. Refunds due are processed without undue delay and no later than 14 days after we are informed of your decision.',
      },
    ],
  },
  {
    id: "subscription-cancellation",
    number: 7,
    title: "Subscription Term & Cancellation",
    blocks: [
      {
        type: "clause",
        number: "7.1",
        content:
          "No fixed minimum term. Unless stated otherwise at the time of booking (for example, for a Pilot under Section 8), Subscriptions run on a rolling basis with no minimum commitment and may be cancelled at any time, effective from the next unbilled cycle, subject to 7.2.",
      },
      {
        type: "clause",
        number: "7.2",
        content:
          "Cancellation notice. To avoid being charged for the next scheduled visit, cancellation of an ongoing Subscription must be made at least 24 hours before the next scheduled Booking.",
      },
      {
        type: "clause",
        number: "7.3",
        content:
          "Easy cancellation. In line with the Finnish law in force from 19 June 2026 requiring that an online subscription be cancellable at least as easily as it was started, Frosh provides a direct cancellation function via your user dashboard on frosh.fi. Frosh will confirm receipt of a cancellation request and its effective date.",
      },
      {
        type: "clause",
        number: "7.4",
        content:
          "Cancellation by Frosh. Frosh may suspend or terminate a Subscription, or decline a Booking, on reasonable notice — including for non-payment, repeated access failures, or conduct that endangers a Cleaner's safety or wellbeing.",
      },
    ],
  },
  {
    id: "wellbeing-pilots",
    number: 8,
    title: "Employee Wellbeing Benefit & Pilots",
    blocks: [
      {
        type: "callout",
        variant: "info",
        title: "Applies to business Customers only",
        content:
          "This section governs arrangements where Frosh is engaged by a company or organization rather than a private individual.",
      },
      {
        type: "clause",
        number: "8.1",
        content:
          "Where Frosh offers the Service as an employee wellbeing benefit to a business Customer — whether as a paid, co-funded, or no-cost Pilot — the specific scope, headcount, duration, and any fees are set out in a separate written agreement, order confirmation, or email exchange, which forms part of these Terms for that arrangement.",
      },
      {
        type: "clause",
        number: "8.2",
        content:
          "A no-cost or discounted Pilot creates no obligation on either party to continue the Service beyond the agreed Pilot period, and either party may end a Pilot early on reasonable notice.",
      },
      {
        type: "clause",
        number: "8.3",
        content:
          "Feedback collected from individual employees during a Pilot may be used by Frosh in anonymised or aggregate form for service improvement, and — only with the individual's or the business Customer's separate consent — for marketing purposes.",
      },
    ],
  },
  {
    id: "liability-insurance",
    number: 9,
    title: "Liability & Insurance",
    blocks: [
      {
        type: "clause",
        number: "9.1",
        content:
          "Care standard. Frosh performs the Service with reasonable skill and care, using vetted and insured Cleaners.",
      },
      {
        type: "clause",
        number: "9.2",
        content:
          "Damage claims. Any claim for loss or damage allegedly caused during a Booking must be reported to Frosh within 48 hours of the visit, with reasonable supporting detail (e.g. photos), to allow investigation and, where applicable, an insurance claim.",
      },
      {
        type: "clause",
        number: "9.3",
        content:
          "Limitation of liability. To the extent permitted by Finnish law, Frosh's liability for a valid claim arising from a single Booking is limited to the price paid for that Booking. Nothing in these Terms excludes or limits Frosh's liability for death or personal injury caused by negligence, for fraud, or for any other liability that cannot lawfully be excluded or limited under Finnish or EU consumer-protection law.",
      },
      {
        type: "clause",
        number: "9.4",
        content:
          "Customer disclosure. Frosh is not liable for damage to items of unusual or high value, or items in poor or fragile condition, that were not disclosed in advance under 4.3.",
      },
    ],
  },
  {
    id: "data-protection",
    number: 10,
    title: "Data Protection",
    blocks: [
      {
        type: "clause",
        number: "10.1",
        content:
          "Frosh processes personal data (such as name, contact details, address, payment information, and access instructions) as data controller, to provide and administer the Service, in accordance with the EU General Data Protection Regulation (GDPR) and Finnish data protection law.",
      },
      {
        type: "clause",
        number: "10.2",
        content:
          "Full details of what data is collected, why, how long it is retained, which processors (e.g. payment providers, scheduling tools) it may be shared with, and your rights (access, rectification, erasure, restriction, objection, and portability) are set out in a separate Privacy Policy at frosh.fi/privacy.",
      },
      {
        type: "clause",
        number: "10.3",
        content:
          "You have the right to lodge a complaint with the Finnish Data Protection Ombudsman (Tietosuojavaltuutetun toimisto, tietosuoja.fi) if you believe your data has been processed unlawfully.",
      },
    ],
  },
  {
    id: "complaints-disputes",
    number: 11,
    title: "Complaints & Dispute Resolution",
    blocks: [
      {
        type: "clause",
        number: "11.1",
        content:
          "Complaints. If you are unhappy with a Booking, contact us at hello@frosh.fi so we can put it right — most issues are resolved directly and quickly this way.",
      },
      {
        type: "clause",
        number: "11.2",
        content:
          "Consumer Disputes Board. If a complaint cannot be resolved directly, consumer Customers may refer the matter to the Finnish Consumer Disputes Board (Kuluttajariitalautakunta, kuluttajariita.fi) or seek advice from the Finnish Competition and Consumer Authority (KKV). Note that the EU's online dispute resolution platform was discontinued in July 2025 and should not be referenced as an active option.",
      },
      {
        type: "clause",
        number: "11.3",
        content:
          "Governing law & jurisdiction. These Terms are governed by Finnish law. Disputes are subject to the jurisdiction of the competent Finnish courts, without prejudice to any mandatory consumer-protection rights a consumer Customer has under the law of their EU country of residence.",
      },
    ],
  },
  {
    id: "changes-to-terms",
    number: 12,
    title: "Changes to These Terms",
    blocks: [
      {
        type: "clause",
        number: "12.1",
        content:
          "Frosh may update these Terms from time to time, for example to reflect changes in law or in its services. For active Subscriptions, material changes will be notified at least 30 days in advance by email; continued use of the Service after that date constitutes acceptance. Consumers may cancel before the changes take effect, as described in Section 7.",
      },
    ],
  },
  {
    id: "contact",
    number: 13,
    title: "Contact",
    blocks: [
      {
        type: "contact",
        lines: [
          { label: "Company", value: "Frosh Enterprises" },
          { label: "Business ID (Y-tunnus)", value: "3599859-5" },
          {
            label: "Registered address",
            value: "19 K53 Näyttelijänkatu, 33720 Tampere, Finland",
          },
          { label: "Email", value: "hello@frosh.fi" },
          { label: "Website", value: "frosh.fi" },
        ],
      },
    ],
  },
];
