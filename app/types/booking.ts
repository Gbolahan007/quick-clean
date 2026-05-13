import type { ApartmentType } from "../[locale]/pricing/data/apartmentType";

export type { ApartmentType };

export type ServiceType = "maintenance" | "deep";
export type BookingFrequency = "one-time" | "weekly" | "biweekly" | "monthly";

// ── Plan ──────────────────────────────────────────────────────────────────────

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

// ── Addons ────────────────────────────────────────────────────────────────────

export type QtyMap = Record<string, number>;

export interface AddonsSummary {
  selectedCount: number;
  rawTotal: number;
  discount: number;
  discountedTotal: number;
  qtyMap: QtyMap;
}

// ── Pricing snapshot — set ONCE at "Book Now", never mutated ──────────────────

export interface PricingSnapshot {
  serviceType: ServiceType;
  showDeducted: boolean;

  apartment: ApartmentType;
  planKey: string;
  planLabel: string;
  frequency: BookingFrequency;
  selectedAddonNames: string[];
  basePrice: number;
  addonsSummary: AddonsSummary;
  totalPrice: number;
}

// ── Step 1: Contact ───────────────────────────────────────────────────────────

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ── Step 2: Address ───────────────────────────────────────────────────────────

export interface AddressInfo {
  streetAddress: string;
  apartmentNumber?: string;
  city: string;
  postalCode: string;
  squareMeters: number;
  numberOfRooms: number;
  accessInstructions?: string;
}

// ── Step 3: Schedule ──────────────────────────────────────────────────────────

export interface ScheduleInfo {
  bookingDate: string;
  timeSlot: string;
  slotId: string;
  slotEndTime: string;
}

// ── Step 4: Notes ─────────────────────────────────────────────────────────────

export interface NotesInfo {
  specialInstructions?: string;
  hasPets: boolean;
  petDetails?: string;
}

// ── Booking steps ─────────────────────────────────────────────────────────────

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

// ── Store shape ───────────────────────────────────────────────────────────────

export interface BookingState {
  /** Set once on "Book Now" — never mutated during the booking flow */
  pricing: PricingSnapshot | null;
  currentStep: BookingStep;
  contact: Partial<ContactInfo>;
  address: Partial<AddressInfo>;
  schedule: Partial<ScheduleInfo>;
  notes: Partial<NotesInfo>;
  isSubmitting: boolean;
  submissionError: string | null;
  confirmedBookingId: string | null;
}

export interface BookingActions {
  initBooking: (snapshot: PricingSnapshot) => void;
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  saveContact: (data: ContactInfo) => void;
  saveAddress: (data: AddressInfo) => void;
  saveSchedule: (data: ScheduleInfo) => void;
  saveNotes: (data: NotesInfo) => void;
  submitBooking: () => Promise<void>;
  resetBooking: () => void;
}
