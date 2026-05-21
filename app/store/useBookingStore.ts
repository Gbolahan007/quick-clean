import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";
import type {
  BookingState,
  BookingActions,
  BookingStep,
  PricingSnapshot,
  ContactInfo,
  AddressInfo,
  ScheduleInfo,
  NotesInfo,
} from "../types/booking";
import type { BookingSubmitPayload } from "../types/api";
import { BOOKING_STEPS } from "../types/booking";

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_STATE: BookingState = {
  pricing: null,
  currentStep: "contact",
  contact: {},
  address: {},
  schedule: {},
  notes: {},
  isSubmitting: false,
  submissionError: null,
  confirmedBookingId: null,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Init ───────────────────────────────────────────────────────────────

      initBooking: (snapshot: PricingSnapshot) => {
        const current = get();
        const isNewBooking =
          !current.pricing ||
          current.pricing.planKey !== snapshot.planKey ||
          current.pricing.serviceType !== snapshot.serviceType ||
          current.pricing.apartment.key !== snapshot.apartment.key;

        if (isNewBooking) {
          // Fresh booking — wipe step data for the new selection
          set({
            pricing: snapshot,
            currentStep: "contact",
            contact: {},
            address: {},
            schedule: {},
            notes: {},
            isSubmitting: false,
            submissionError: null,
            confirmedBookingId: null,
          });
        } else {
          // Same booking — just update pricing snapshot, keep form data
          set({
            pricing: snapshot,
            submissionError: null,
          });
        }
      },

      // ── Navigation ─────────────────────────────────────────────────────────
      goToStep: (step: BookingStep) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep } = get();
        const idx = BOOKING_STEPS.indexOf(currentStep);
        const next = BOOKING_STEPS[idx + 1];
        if (next) set({ currentStep: next });
      },

      prevStep: () => {
        const { currentStep } = get();
        const idx = BOOKING_STEPS.indexOf(currentStep);
        const prev = BOOKING_STEPS[idx - 1];
        if (prev) set({ currentStep: prev });
      },

      // ── Step saves ─────────────────────────────────────────────────────────
      saveContact: (data: ContactInfo) => {
        set({ contact: data });
        get().nextStep();
      },

      saveAddress: (data: AddressInfo) => {
        set({ address: data });
        get().nextStep();
      },

      saveSchedule: (data: ScheduleInfo) => {
        set({ schedule: data });
        get().nextStep();
      },

      saveNotes: (data: NotesInfo) => {
        set({ notes: data });
        get().nextStep();
      },

      // ── Submit ─────────────────────────────────────────────────────────────
      submitBooking: async () => {
        const { pricing, contact, address, schedule, notes } = get();

        if (!pricing) {
          set({ submissionError: "No pricing data found. Please start over." });
          return;
        }

        set({ isSubmitting: true, submissionError: null });

        try {
          const { submitBookingAction } =
            await import("@/app/actions/submitBooking");

          const payload: BookingSubmitPayload = {
            // ── Customer ───────────────────────────────────────────────────
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            email: contact.email ?? "",
            phone: contact.phone ?? "",

            // ── Address ────────────────────────────────────────────────────
            streetAddress: address.streetAddress ?? "",
            apartmentNumber: address.apartmentNumber,
            city: address.city ?? "",
            postalCode: address.postalCode ?? "",
            squareMeters:
              address.squareMeters ?? pricing.apartment.squareMeters,
            numberOfRooms:
              address.numberOfRooms ?? pricing.apartment.numberOfRooms,
            accessInstructions: address.accessInstructions,

            // ── Schedule ───────────────────────────────────────────────────
            bookingDate: schedule.bookingDate ?? "",
            timeSlot: schedule.timeSlot ?? "",
            slotId: schedule.slotId ?? "",

            // ── Service snapshot ───────────────────────────────────────────
            serviceType: pricing.serviceType,
            planKey: pricing.planKey,
            planLabel: pricing.planLabel,
            frequency: pricing.frequency,
            showDeducted: pricing.showDeducted,
            basePrice: pricing.basePrice,
            finalPrice: pricing.totalPrice,

            // ── Apartment snapshot ─────────────────────────────────────────
            apartmentKey: pricing.apartment.key,
            apartmentLabel: pricing.apartment.labelKey,
            apartmentSize: pricing.apartment.size,

            // ── Addons snapshot ────────────────────────────────────────────
            addonsSnapshot: {
              count: pricing.addonsSummary.selectedCount,
              rawTotal: pricing.addonsSummary.rawTotal,
              discount: pricing.addonsSummary.discount,
              discountedTotal: pricing.addonsSummary.discountedTotal,
              names: pricing.selectedAddonNames,
            },

            // ── Notes ─────────────────────────────────────────────────────
            specialNotes: JSON.stringify({
              instructions: notes.specialInstructions ?? null,
              hasPets: notes.hasPets ?? false,
              petDetails: notes.hasPets ? (notes.petDetails ?? null) : null,
            }),
          };

          const result = await submitBookingAction(payload);

          if (!result.success) {
            set({ submissionError: result.error, isSubmitting: false });
            return;
          }

          // ── Success ────────────────────────────────────────────────────────

          set({
            ...INITIAL_STATE,
            confirmedBookingId: result.bookingId,
            isSubmitting: false,
          });

          console.log(
            "[submitBooking] ✓ Success",
            "bookingId:",
            result.bookingId,
            "customerId:",
            result.customerId,
          );
        } catch (err) {
          set({
            submissionError:
              err instanceof Error
                ? err.message
                : "Something went wrong. Please try again.",
            isSubmitting: false,
          });
        }
      },

      // ── Reset ──────────────────────────────────────────────────────────────

      resetBooking: () => set(INITIAL_STATE),
    }),

    // ── Persist config ────────────────────────────────────────────────────────
    {
      name: "booking-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pricing: state.pricing,
        currentStep: state.currentStep,
        contact: state.contact,
        address: state.address,
        schedule: state.schedule,
        notes: state.notes,
        // confirmedBookingId intentionally excluded — in-memory only
      }),
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────────

export function useStepCompletion() {
  const firstName = useBookingStore((s) => s.contact.firstName);
  const lastName = useBookingStore((s) => s.contact.lastName);
  const email = useBookingStore((s) => s.contact.email);
  const phone = useBookingStore((s) => s.contact.phone);
  const streetAddress = useBookingStore((s) => s.address.streetAddress);
  const city = useBookingStore((s) => s.address.city);
  const postalCode = useBookingStore((s) => s.address.postalCode);
  const squareMeters = useBookingStore((s) => s.address.squareMeters);
  const numberOfRooms = useBookingStore((s) => s.address.numberOfRooms);
  const bookingDate = useBookingStore((s) => s.schedule.bookingDate);
  const timeSlot = useBookingStore((s) => s.schedule.timeSlot);
  const slotId = useBookingStore((s) => s.schedule.slotId);

  return useMemo(
    () => ({
      contact: !!firstName && !!lastName && !!email && !!phone,
      address:
        !!streetAddress &&
        !!city &&
        !!postalCode &&
        !!squareMeters &&
        !!numberOfRooms,
      schedule: !!bookingDate && !!timeSlot && !!slotId,
      notes: true,
      review: true,
    }),
    [
      firstName,
      lastName,
      email,
      phone,
      streetAddress,
      city,
      postalCode,
      squareMeters,
      numberOfRooms,
      bookingDate,
      timeSlot,
      slotId,
    ],
  );
}

export function useCurrentStepIndex() {
  return useBookingStore((s) => BOOKING_STEPS.indexOf(s.currentStep));
}
