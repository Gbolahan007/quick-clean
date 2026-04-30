import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
import { BOOKING_STEPS } from "../types/booking";
import { useMemo } from "react";

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
      // ── State ──────────────────────────────────────────────────────────────
      ...INITIAL_STATE,

      // ── Init ───────────────────────────────────────────────────────────────
      initBooking: (snapshot: PricingSnapshot) => {
        set({
          pricing: snapshot,
          currentStep: "contact",
          // Preserve any previously entered contact/address so the user
          // doesn't have to retype on a second visit.
          submissionError: null,
          confirmedBookingId: null,
        });
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
          // ── Build payload ──────────────────────────────────────────────────
          const payload = {
            // Service
            service_type: pricing.serviceType,
            plan_key: pricing.planKey,
            plan_label: pricing.planLabel,
            show_deducted: pricing.showDeducted,

            // Apartment
            apartment_key: pricing.apartment.key,
            apartment_label: pricing.apartment.labelKey,
            apartment_size: pricing.apartment.size,

            // Prices
            base_price: pricing.basePrice,
            addons_summary: pricing.addonsSummary,
            total_price: pricing.totalPrice,

            // Contact
            first_name: contact.firstName ?? "",
            last_name: contact.lastName ?? "",
            email: contact.email ?? "",
            phone: contact.phone ?? "",
            company: contact.company ?? null,

            // Address
            street: address.street ?? "",
            apartment_number: address.apartment ?? null,
            city: address.city ?? "",
            postal_code: address.postalCode ?? "",
            access_instructions: address.accessInstructions ?? null,

            // Schedule
            preferred_date: schedule.preferredDate ?? "",
            preferred_time: schedule.preferredTime ?? "",
            alternate_date: schedule.alternateDate ?? null,

            // Notes
            special_instructions: notes.specialInstructions ?? null,
            has_pets: notes.hasPets ?? false,
            pet_details: notes.petDetails ?? null,

            // Meta
            submitted_at: new Date().toISOString(),
            status: "pending",
          };

          // ── Supabase insert ────────────────────────────────────────────────
          // Dynamic import keeps supabase out of the initial bundle for
          // pages that don't need it.
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          );

          const { data, error } = await supabase
            .from("bookings")
            .insert(payload)
            .select("id")
            .single();

          if (error) throw error;

          set({
            confirmedBookingId: data?.id ?? "confirmed",
            isSubmitting: false,
          });
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.";
          set({ submissionError: message, isSubmitting: false });
        }
      },

      // ── Reset ──────────────────────────────────────────────────────────────
      resetBooking: () => set(INITIAL_STATE),
    }),

    // ── Persist config ─────────────────────────────────────────────────────
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
        confirmedBookingId: state.confirmedBookingId,
      }),
    },
  ),
);

// ── Convenience selectors ─────────────────────────────────────────────────────

/** True when every required field for a step has been completed */
export function useStepCompletion() {
  const firstName = useBookingStore((s) => s.contact.firstName);
  const lastName = useBookingStore((s) => s.contact.lastName);
  const email = useBookingStore((s) => s.contact.email);
  const phone = useBookingStore((s) => s.contact.phone);
  const street = useBookingStore((s) => s.address.street);
  const city = useBookingStore((s) => s.address.city);
  const postalCode = useBookingStore((s) => s.address.postalCode);
  const preferredDate = useBookingStore((s) => s.schedule.preferredDate);
  const preferredTime = useBookingStore((s) => s.schedule.preferredTime);

  return useMemo(
    () => ({
      contact: !!firstName && !!lastName && !!email && !!phone,
      address: !!street && !!city && !!postalCode,
      schedule: !!preferredDate && !!preferredTime,
      notes: true,
      review: true,
    }),
    [
      firstName,
      lastName,
      email,
      phone,
      street,
      city,
      postalCode,
      preferredDate,
      preferredTime,
    ],
  );
}

/** Current step index (0-based) */
export function useCurrentStepIndex() {
  return useBookingStore((s) => BOOKING_STEPS.indexOf(s.currentStep));
}
