import type { BookingEmailData, EmailLocale } from "./types";

// ── Duration lookup by service + apartment ────────────────────────────────────

const DURATION_MAP: Record<string, Record<string, string>> = {
  maintenance: {
    studio: "1.5–2 hours",
    two: "2–2.5 hours",
    three: "2.5–3 hours",
    four: "3–4 hours",
  },
  deep: {
    studio: "2–3 hours",
    two: "3–4 hours",
    three: "4–5 hours",
    four: "5–6 hours",
  },
  moveout: {
    studio: "2–3 hours",
    two: "3–4 hours",
    three: "4–5 hours",
    four: "6 hours (2 cleaners)",
  },
  office: { default: "As per contract" },
};

function getDuration(serviceType: string, apartmentKey: string): string {
  const map = DURATION_MAP[serviceType];
  if (!map) return "To be confirmed";
  return map[apartmentKey] ?? map.default ?? "To be confirmed";
}

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(dateStr: string, locale: EmailLocale): string {
  try {
    return new Date(dateStr).toLocaleDateString(
      locale === "fi" ? "fi-FI" : "en-GB",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    );
  } catch {
    return dateStr;
  }
}

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

// ── Address formatter ─────────────────────────────────────────────────────────

function formatAddress(
  streetAddress: string,
  apartmentNumber: string | undefined | null,
  postalCode: string,
  city: string,
): string {
  const line1 = [streetAddress, apartmentNumber].filter(Boolean).join(", ");
  return `${line1}, ${postalCode} ${city}`;
}

// ── Payment label ─────────────────────────────────────────────────────────────

function formatPayment(method?: string): string {
  const map: Record<string, string> = {
    stripe: "Card (Stripe)",
    invoice: "Invoice",
    cash: "Cash",
  };
  return method ? (map[method.toLowerCase()] ?? method) : "Invoice";
}

// ── Residential booking ───────────────────────────────────────────────────────

export interface ResidentialEmailInput {
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  streetAddress: string;
  apartmentNumber?: string | null;
  postalCode: string;
  city: string;
  serviceType: string;
  planKey: string;
  planLabel: string;
  bookingDate: string;
  timeSlot: string;
  specialNotes?: string;
  paymentMethod?: string;
  finalPrice: number;
  showDeducted: boolean;
  apartmentKey: string;
  frequency: string;
  locale: EmailLocale;
  createdAt: string;
}

export function buildResidentialEmailData(
  input: ResidentialEmailInput,
): BookingEmailData {
  return {
    customerFirstName: input.firstName,
    customerLastName: input.lastName,
    customerEmail: input.email,
    customerPhone: input.phone,
    bookingId: input.bookingId,
    serviceType: input.planLabel,
    planLabel: input.planLabel,
    cleaningDate: formatDate(input.bookingDate, input.locale),
    cleaningTime: input.timeSlot,
    estimatedDuration: getDuration(input.serviceType, input.apartmentKey),
    address: formatAddress(
      input.streetAddress,
      input.apartmentNumber,
      input.postalCode,
      input.city,
    ),
    totalPrice: `€${input.finalPrice.toFixed(2)}`,
    paymentMethod: formatPayment(input.paymentMethod),
    subscriptionPlan: input.planLabel,
    specialInstructions: input.specialNotes,
    locale: input.locale,
    createdAt: formatCreatedAt(input.createdAt),
  };
}

// ── Office booking ────────────────────────────────────────────────────────────

export interface OfficeEmailInput {
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  streetAddress: string;
  apartmentNumber?: string | null;
  postalCode: string;
  city: string;
  officeName: string;
  officeSizeSqm: number;
  weeklyHours: number;
  hourlyRate: number;
  pricingTier: string;
  monthlyEstimate: number;
  firstBookingDate: string;
  defaultStartTime: string;
  eveningWeekendSurcharge: boolean;
  specialNotes?: string;
  planLabel: string;
  selectedAddons: string[];
  locale: EmailLocale;
  createdAt: string;
}

export function buildOfficeEmailData(
  input: OfficeEmailInput,
): BookingEmailData {
  const scheduleDesc = `${input.weeklyHours}h/week · ${input.pricingTier.toUpperCase()} · €${input.hourlyRate}/h`;
  const addonsList =
    input.selectedAddons.length > 0
      ? input.selectedAddons.join(", ")
      : undefined;

  return {
    customerFirstName: input.firstName,
    customerLastName: input.lastName,
    customerEmail: input.email,
    customerPhone: input.phone,
    bookingId: input.bookingId,
    serviceType: `Office Cleaning — ${input.officeName}`,
    planLabel: input.planLabel,
    cleaningDate: formatDate(input.firstBookingDate, input.locale),
    cleaningTime: input.defaultStartTime,
    estimatedDuration: scheduleDesc,
    address: formatAddress(
      input.streetAddress,
      input.apartmentNumber,
      input.postalCode,
      input.city,
    ),
    totalPrice: `€${input.monthlyEstimate.toFixed(2)} / month`,
    paymentMethod: "Invoice",
    subscriptionPlan: `Weekly recurring · ${input.officeSizeSqm} m²`,
    specialInstructions:
      [
        addonsList ? `Add-ons: ${addonsList}` : null,
        input.eveningWeekendSurcharge
          ? "Evening / weekend surcharge applies (+15%)"
          : null,
        input.specialNotes ?? null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    locale: input.locale,
    createdAt: formatCreatedAt(input.createdAt),
  };
}
