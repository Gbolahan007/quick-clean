// store/useOfficeBookingStore.ts

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { calculateOfficePricing } from "../[locale]/pricing/data/lib/officePricing";
import type { AddressInfo, ContactInfo } from "../types/booking";
import type {
  OfficeAddonsInfo,
  OfficeBookingStep,
  OfficeDetailsInfo,
  OfficePricingResult,
  OfficeScheduleInfo,
} from "../types/office";
import { OFFICE_BOOKING_STEPS } from "../types/office";

const INITIAL_OFFICE_STATE = {
  details: {} as Partial<OfficeDetailsInfo>,
  schedule: {} as Partial<OfficeScheduleInfo>,
  addons: { selected: [], addonsMonthlyTotal: 0 } as OfficeAddonsInfo,
  pricing: null as OfficePricingResult | null,
  contact: {} as Partial<ContactInfo>,
  address: {} as Partial<AddressInfo>,
  currentStep: "details" as OfficeBookingStep,
  isSubmitting: false,
  submissionError: null as string | null,
  confirmedBookingId: null as string | null,
};

type OfficeBookingFullState = typeof INITIAL_OFFICE_STATE;

interface OfficeBookingActions {
  goToStep: (step: OfficeBookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  saveDetails: (data: OfficeDetailsInfo) => void;
  saveSchedule: (data: OfficeScheduleInfo) => void;
  saveAddons: (data: OfficeAddonsInfo) => void;
  saveContact: (data: ContactInfo) => void;
  saveAddress: (data: AddressInfo) => void;
  recalculatePricing: (weeklyHours: number, hasSurcharge: boolean) => void;
  submitOfficeBooking: () => Promise<void>;
  resetOfficeBooking: () => void;
}

export const useOfficeBookingStore = create<
  OfficeBookingFullState & OfficeBookingActions
>()(
  persist(
    (set, get) => ({
      ...INITIAL_OFFICE_STATE,

      goToStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep } = get();
        const idx = OFFICE_BOOKING_STEPS.indexOf(currentStep);
        const next = OFFICE_BOOKING_STEPS[idx + 1];
        if (next) set({ currentStep: next });
      },

      prevStep: () => {
        const { currentStep } = get();
        const idx = OFFICE_BOOKING_STEPS.indexOf(currentStep);
        const prev = OFFICE_BOOKING_STEPS[idx - 1];
        if (prev) set({ currentStep: prev });
      },

      saveDetails: (data) => {
        set({ details: data });
        get().nextStep();
      },

      saveSchedule: (data) => {
        const pricing = calculateOfficePricing(
          data.weeklyHours ?? 0,
          data.eveningWeekendSurcharge ?? false,
        );
        set({ schedule: data, pricing });
        get().nextStep();
      },

      saveAddons: (data) => {
        set({ addons: data });
        get().nextStep();
      },
      saveContact: (data) => {
        set({ contact: data });
        get().nextStep();
      },
      saveAddress: (data) => {
        set({ address: data });
        get().nextStep();
      },

      recalculatePricing: (weeklyHours, hasSurcharge) => {
        if (weeklyHours < 2) return;
        set({ pricing: calculateOfficePricing(weeklyHours, hasSurcharge) });
      },

      submitOfficeBooking: async () => {
        const { details, schedule, addons, pricing, contact, address } = get();

        if (!pricing || !details.officeName) {
          set({ submissionError: "Missing booking data. Please start over." });
          return;
        }

        set({ isSubmitting: true, submissionError: null });

        try {
          const { submitOfficeBookingAction } =
            await import("../actions/submitOfficeBooking");

          const planKeyMap: Record<string, string> = {
            tier1: "office-tier1",
            tier2: "office-tier2",
            tier3: "office-tier3",
          };
          const planKey = planKeyMap[pricing.tier] ?? "office-tier1";
          const planLabel = `Tier ${pricing.tier.replace("tier", "")} — ${pricing.weeklyHours}h/week`;

          const payload = {
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            email: contact.email ?? "",
            phone: contact.phone ?? "",

            streetAddress: address.streetAddress ?? "",
            apartmentNumber: address.apartmentNumber,
            city: address.city ?? "",
            postalCode: address.postalCode ?? "",
            accessInstructions: address.accessInstructions,
            squareMeters: details.officeSizeSqm ?? 50,
            numberOfRooms: Math.ceil((details.officeSizeSqm ?? 50) / 25),

            officeName: details.officeName ?? "",
            workspaceType: details.workspaceType ?? "open_plan",
            officeSizeSqm: details.officeSizeSqm ?? 50,
            staffCount: details.staffCount ?? 0,

            weeklyHours: schedule.weeklyHours ?? 0,
            recurringRules: schedule.recurringRules ?? [],
            eveningWeekendSurcharge: schedule.eveningWeekendSurcharge ?? false,
            frequency: "weekly" as const,

            weeklyHoursInput: pricing.weeklyHours,
            pricingTier: pricing.tier,
            hourlyRate: pricing.hourlyRate,
            monthlyEstimate: pricing.finalMonthly,

            selectedAddons: addons.selected,
            addonsMonthlyTotal: addons.addonsMonthlyTotal,

            specialNotes: JSON.stringify({
              officeNotes: null,
              accessDetails: address.accessInstructions ?? null,
            }),

            serviceType: "office" as const,
            planKey,
            planLabel,
            finalPrice: pricing.finalMonthly + addons.addonsMonthlyTotal,
            basePrice: pricing.monthlyCost,
          };

          const result = await submitOfficeBookingAction(payload);

          if (!result.success) {
            set({ submissionError: result.error, isSubmitting: false });
            return;
          }

          // ── Redirect to Stripe Checkout ─────────────────────────────────

          console.log(
            "[submitOfficeBooking] ✓ Redirecting to Stripe Checkout | bookingId:",
            result.bookingId,
          );
          window.location.href = result.checkoutUrl;
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

      resetOfficeBooking: () => set(INITIAL_OFFICE_STATE),
    }),

    {
      name: "office-booking-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        details: state.details,
        schedule: state.schedule,
        addons: state.addons,
        pricing: state.pricing,
        contact: state.contact,
        address: state.address,
        currentStep: state.currentStep,
      }),
    },
  ),
);

export function useOfficeStepCompletion() {
  const details = useOfficeBookingStore((s) => s.details);
  const schedule = useOfficeBookingStore((s) => s.schedule);
  const pricing = useOfficeBookingStore((s) => s.pricing);
  const contact = useOfficeBookingStore((s) => s.contact);
  const address = useOfficeBookingStore((s) => s.address);

  return useMemo(
    () => ({
      details:
        !!details.officeName &&
        !!details.workspaceType &&
        !!details.officeSizeSqm,
      schedule:
        !!schedule.weeklyHours &&
        (schedule.recurringRules?.length ?? 0) > 0 &&
        !!pricing,
      addons: true,
      contact:
        !!contact.firstName &&
        !!contact.lastName &&
        !!contact.email &&
        !!contact.phone,
      address:
        !!address.streetAddress && !!address.city && !!address.postalCode,
      review: true,
    }),
    [details, schedule, pricing, contact, address],
  );
}

export function useOfficeCurrentStepIndex() {
  return useOfficeBookingStore((s) =>
    OFFICE_BOOKING_STEPS.indexOf(s.currentStep),
  );
}
