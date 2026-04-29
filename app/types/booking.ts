// types/booking.ts
// ─────────────────────────────────────────────────────────────────────────────
// All shared types for the booking funnel.
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceType = "maintenance" | "deep";

export type Locale = "en" | "fi";

// ── Apartment ────────────────────────────────────────────────────────────────

export interface ApartmentType {
  key: string;
  labelKey: string;
  size: string;
  emoji: string;
}

// ── Plan ─────────────────────────────────────────────────────────────────────

export interface Plan {
  key: string;
  labelKey: string;
  badge: string | null;
  discountKey: string | null;
  visitInfoKey: string | null;
  priceType: string;
  prices: number[];
  deducted: number[];
  durations: string[];
  cleaners?: (string | number)[];
  visits?: number | null;
  visitsCount?: number | null;
  visitsPerYear?: number | null;
}

// ── Addons ───────────────────────────────────────────────────────────────────

export type QtyMap = Record<string, number>;

export interface AddonsSummary {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
}

// ── Pricing snapshot (captured at "Book Now" click) ───────────────────────────

export interface PricingSnapshot {
  serviceType: ServiceType;
  showDeducted: boolean;
  apartment: ApartmentType;
  planKey: string;
  planLabel: string;
  /** base price for the chosen apt × plan combination */
  basePrice: number;
  addonsSummary: AddonsSummary;
  /** basePrice + addonsSummary.discountedTotal */
  totalPrice: number;
}

// ── Contact form (step 1) ─────────────────────────────────────────────────────

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Optional company name (for business accounts) */
  company?: string;
}

// ── Address form (step 2) ─────────────────────────────────────────────────────

export interface AddressInfo {
  street: string;
  apartment?: string;
  city: string;
  postalCode: string;
  accessInstructions?: string;
}

// ── Schedule (step 3) ────────────────────────────────────────────────────────

export interface ScheduleInfo {
  /** ISO date string, e.g. "2025-09-15" */
  preferredDate: string;
  /** e.g. "08:00", "10:00", "12:00", "14:00" */
  preferredTime: string;
  /** Optional alternative date */
  alternateDate?: string;
}

// ── Notes (step 4) ───────────────────────────────────────────────────────────

export interface NotesInfo {
  specialInstructions?: string;
  /** true = user has a pet that needs to be known about */
  hasPets: boolean;
  petDetails?: string;
}

// ── Booking step IDs ─────────────────────────────────────────────────────────

export type BookingStep =
  | "contact"
  | "address"
  | "schedule"
  | "notes"
  | "review";

export const BOOKING_STEPS: BookingStep[] = [
  "contact",
  "address",
  "schedule",
  "notes",
  "review",
];

// ── Full booking state ────────────────────────────────────────────────────────

export interface BookingState {
  /** Snapshot from pricing page — set once on "Book Now" */
  pricing: PricingSnapshot | null;

  /** Current active step */
  currentStep: BookingStep;

  /** Step data — filled progressively */
  contact: Partial<ContactInfo>;
  address: Partial<AddressInfo>;
  schedule: Partial<ScheduleInfo>;
  notes: Partial<NotesInfo>;

  /** Submission state */
  isSubmitting: boolean;
  submissionError: string | null;
  confirmedBookingId: string | null;
}

// ── Store actions ─────────────────────────────────────────────────────────────

export interface BookingActions {
  /** Called from SummaryBar "Book Now" */
  initBooking: (snapshot: PricingSnapshot) => void;

  /** Navigate between steps */
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  /** Step-level save handlers */
  saveContact: (data: ContactInfo) => void;
  saveAddress: (data: AddressInfo) => void;
  saveSchedule: (data: ScheduleInfo) => void;
  saveNotes: (data: NotesInfo) => void;

  /** Final submission */
  submitBooking: () => Promise<void>;

  /** Reset everything (after confirmation or on cancel) */
  resetBooking: () => void;
}
