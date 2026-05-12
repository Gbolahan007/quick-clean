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
  /** Full apartment object from APARTMENT_TYPES — includes squareMeters & numberOfRooms */
  apartment: ApartmentType;
  planKey: string;
  planLabel: string;
  /** Derived from planKey in useInitBooking — single source, never re-entered */
  frequency: BookingFrequency;
  selectedAddonNames: string[];
  basePrice: number;
  addonsSummary: AddonsSummary;
  totalPrice: number;
}

// ── Step 1: Contact ───────────────────────────────────────────────────────────
// → profiles.full_name (firstName + lastName joined on save)
// → profiles.phone
// → auth.users.email (Supabase Auth — not a direct DB insert)

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ── Step 2: Address ───────────────────────────────────────────────────────────
// → addresses table (all fields)
// squareMeters / numberOfRooms are pre-filled from PricingSnapshot.apartment
// and shown as editable fields in StepAddress so the user can correct them.

export interface AddressInfo {
  /** addresses.street_address — TEXT NOT NULL */
  streetAddress: string;
  /** addresses.apartment_number — TEXT nullable */
  apartmentNumber?: string;
  /** addresses.city — TEXT NOT NULL */
  city: string;
  /** addresses.postal_code — TEXT NOT NULL */
  postalCode: string;
  /** addresses.square_meters — INTEGER NOT NULL, pre-filled from pricing.apartment.squareMeters */
  squareMeters: number;
  /** addresses.number_of_rooms — INTEGER NOT NULL, pre-filled from pricing.apartment.numberOfRooms */
  numberOfRooms: number;
  /** addresses.access_instructions — TEXT nullable */
  accessInstructions?: string;
}

// ── Step 3: Schedule ──────────────────────────────────────────────────────────
// → bookings.booking_date (DATE)
// → bookings.time_slot (TIME) — must match availability_slots.start_time

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
