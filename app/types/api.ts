import type { BookingFrequency, ServiceType } from "./booking";

// ── What the server action receives ──────────────────────────────────────────

export interface BookingSubmitPayload {
  // ── Customer ──────────────────────────────────────────────────────────────
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // ── Address ───────────────────────────────────────────────────────────────
  streetAddress: string;
  apartmentNumber?: string;
  city: string;
  postalCode: string;
  squareMeters: number;
  numberOfRooms: number;
  accessInstructions?: string;

  // ── Schedule ──────────────────────────────────────────────────────────────
  bookingDate: string;
  timeSlot: string;
  slotId: string;

  // ── Service / pricing snapshot ────────────────────────────────────────────
  serviceType: ServiceType;
  planKey: string;
  planLabel: string;
  frequency: BookingFrequency;
  showDeducted: boolean;
  basePrice: number;
  finalPrice: number;

  // ── Apartment snapshot ────────────────────────────────────────────────────
  apartmentKey: string;
  apartmentLabel: string;
  apartmentSize: string;

  // ── Addons snapshot ───────────────────────────────────────────────────────
  addonsSnapshot: {
    count: number;
    rawTotal: number;
    discount: number;
    discountedTotal: number;
    names: string[];
  };

  // ── Notes ─────────────────────────────────────────────────────────────────
  specialNotes: string;
  locale?: "en" | "fi";
}

// ── What the server action returns ───────────────────────────────────────────

export type BookingSubmitResult =
  | { success: true; bookingId: string; customerId: string }
  | { success: false; error: string; code?: string };
