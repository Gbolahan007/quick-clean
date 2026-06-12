"use server";
// app/actions/submitOfficeBooking.ts

import { createClient } from "@supabase/supabase-js";
import { officeBookingSubmitSchema } from "../schema/officeBooking";
import {
  calculateOfficePricing,
  validateScheduleHours,
} from "../../app/[locale]/pricing/data/lib/officePricing";
import type { OfficeBookingSubmitPayload } from "../types/office";
import { createOfficeCheckoutSession } from "./createOfficeCheckoutSession";

export type OfficeBookingSubmitResult =
  | {
      success: true;
      bookingId: string;
      customerId: string;
      checkoutUrl: string;
    }
  | { success: false; error: string; code: string };

// Hourly rate in cents — single source of truth.
// Change this when the business rate changes. Never read from client.
const OFFICE_HOURLY_RATE_CENTS = 4500; // €45.00/hour

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function submitOfficeBookingAction(
  payload: OfficeBookingSubmitPayload,
): Promise<OfficeBookingSubmitResult> {
  // ── 1. Validate ────────────────────────────────────────────────────────────
  const parsed = officeBookingSubmitSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_ERROR",
    };
  }

  const data = parsed.data;
  const supabase = getServiceClient();

  try {
    // ── 2. Server-side pricing calculation ────────────────────────────────
    // SECURITY: client sends weeklyHoursInput. Server calculates everything else.
    // Client-provided addonsMonthlyTotal is accepted for display but we
    // re-derive the Stripe amount from server-calculated fields only.
    const serverPricing = calculateOfficePricing(
      data.weeklyHoursInput,
      data.eveningWeekendSurcharge,
    );

    const scheduleValidation = validateScheduleHours(
      data.weeklyHours,
      data.recurringRules,
    );
    if (!scheduleValidation.valid) {
      return {
        success: false,
        error: scheduleValidation.message ?? "Schedule hours mismatch.",
        code: "SCHEDULE_HOURS_MISMATCH",
      };
    }

    // Server-authoritative amounts for Stripe
    const estimatedHours = serverPricing.weeklyHours; // e.g. 3.0
    const hourlyRateCents = OFFICE_HOURLY_RATE_CENTS; // 4500

    const monthlyAmount = serverPricing.finalMonthly + data.addonsMonthlyTotal;

    // ── 3. Find or create customer ─────────────────────────────────────────
    let customerId: string;

    const { data: existing, error: lookupError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (lookupError) throw new Error(`Customer lookup: ${lookupError.message}`);

    if (existing) {
      customerId = existing.id;
      await supabase
        .from("customers")
        .update({
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone,
        })
        .eq("id", customerId);
    } else {
      const { data: created, error: createError } = await supabase
        .from("customers")
        .insert({
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone,
        })
        .select("id")
        .single();
      if (createError)
        throw new Error(`Customer creation: ${createError.message}`);
      customerId = created.id;
    }

    console.log("[submitOfficeBookingAction] Customer:", customerId);

    // ── 4. Insert address ──────────────────────────────────────────────────
    const { data: addressRecord, error: addressError } = await supabase
      .from("addresses")
      .insert({
        customer_id: customerId,
        street_address: data.streetAddress,
        apartment_number: data.apartmentNumber ?? null,
        city: data.city,
        postal_code: data.postalCode,
        square_meters: data.officeSizeSqm,
        number_of_rooms: Math.ceil(data.officeSizeSqm / 25),
        access_instructions: data.accessInstructions ?? null,
        is_default: true,
      })
      .select("id")
      .single();

    if (addressError)
      throw new Error(`Address insertion: ${addressError.message}`);

    // ── 5. Resolve service_id ──────────────────────────────────────────────
    const { data: serviceRecord, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("name_en", "Office Cleaning")
      .eq("is_active", true)
      .single();

    if (serviceError || !serviceRecord) {
      throw new Error(
        "Service 'Office Cleaning' not found. Run the services seed SQL.",
      );
    }

    // ── 6. Duplicate guard ────────────────────────────────────────────────
    const { data: duplicate } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_id", customerId)
      .eq("service_type", "office")
      .eq("address_id", addressRecord.id)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    if (duplicate) {
      return {
        success: false,
        error:
          "An active office cleaning contract already exists for this address.",
        code: "DUPLICATE_OFFICE_BOOKING",
      };
    }

    // ── 7. First booking date ──────────────────────────────────────────────
    const firstBookingDate = getFirstScheduledDate(data.recurringRules);
    const defaultStartTime = data.recurringRules[0]?.startTime ?? "08:00";

    // ── 8. Insert booking ──────────────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        // ── Relations ─────────────────────────────────────────────────────
        customer_id: customerId,
        service_id: serviceRecord.id,
        address_id: addressRecord.id,
        subscription_plan_id: null,

        // ── Schedule ──────────────────────────────────────────────────────
        booking_date: firstBookingDate,
        time_slot: defaultStartTime,

        // ── Status ────────────────────────────────────────────────────────
        status: "pending",
        payment_status: "pending",
        frequency: "weekly",

        // ── Pricing (all server-calculated) ───────────────────────────────
        final_price: monthlyAmount,
        base_price: serverPricing.monthlyCost,

        estimated_hours: estimatedHours,
        hourly_rate_cents: hourlyRateCents,

        // ── Service snapshot ──────────────────────────────────────────────
        service_type: "office",
        plan_key: data.planKey,
        plan_label: data.planLabel,
        show_deducted: false,
        apartment_key: "office",
        apartment_label: `${data.officeSizeSqm} m²`,
        apartment_size: `${data.officeSizeSqm} m²`,

        addons_snapshot: {
          count: data.selectedAddons.length,
          rawTotal: data.addonsMonthlyTotal,
          discount: 0,
          discountedTotal: data.addonsMonthlyTotal,
          names: data.selectedAddons,
        },

        special_notes: data.specialNotes,
        office_name: data.officeName,
        office_size_sqm: data.officeSizeSqm,
        weekly_hours: serverPricing.weeklyHours,
        hourly_rate: serverPricing.hourlyRate,
        recurring_time: defaultStartTime,
        evening_weekend_surcharge: data.eveningWeekendSurcharge,
        monthly_estimate: monthlyAmount,
      })
      .select("id, created_at")
      .single();

    if (bookingError)
      throw new Error(`Booking insertion: ${bookingError.message}`);

    console.log(
      "[submitOfficeBookingAction] Booking created:",
      booking.id,
      `| €${monthlyAmount.toFixed(2)}/month | ${estimatedHours}h/week @ €${(hourlyRateCents / 100).toFixed(2)}/hr`,
    );

    // ── 9. Insert office_schedule_rules ────────────────────────────────────
    const scheduleRows = data.recurringRules.map((rule) => ({
      booking_id: booking.id,
      day_of_week: rule.dayOfWeek,
      start_time: rule.startTime,
      duration_hours: rule.durationHours,
      is_active: true,
    }));

    const { error: scheduleError } = await supabase
      .from("office_schedule_rules")
      .insert(scheduleRows);
    if (scheduleError) {
      console.error(
        "[submitOfficeBookingAction] Schedule rules error:",
        scheduleError.message,
      );
    } else {
      console.log(
        "[submitOfficeBookingAction] Schedule rules inserted:",
        scheduleRows.length,
      );
    }

    // ── 10. Create Stripe Checkout Session ────────────────────────────────

    const checkoutResult = await createOfficeCheckoutSession({
      bookingId: booking.id,
      customerId,
      customerEmail: data.email,
      locale: (data.locale as "en" | "fi") ?? "en",
      successPath: "/pricing/office-cleaning/success",
      cancelPath: "/pricing/office-cleaning/cancelled",
    });

    if (!checkoutResult.success) {
      console.error(
        `[submitOfficeBookingAction] Stripe failed [${booking.id}]:`,
        checkoutResult.error,
      );
      return {
        success: false,
        error: checkoutResult.error,
        code: checkoutResult.code,
      };
    }

    console.log(
      `[submitOfficeBookingAction] Checkout session: ${checkoutResult.sessionId} → ${booking.id}`,
    );

    // ── 11. Return ─────────────────────────────────────────────────────────
    return {
      success: true,
      bookingId: booking.id,
      customerId,
      checkoutUrl: checkoutResult.checkoutUrl,
    };
  } catch (err) {
    console.error("[submitOfficeBookingAction] Fatal:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error.",
      code: "SERVER_ERROR",
    };
  }
}

function getFirstScheduledDate(rules: { dayOfWeek: number }[]): string {
  if (rules.length === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }
  const targetDay = rules[0].dayOfWeek;
  const d = new Date();
  d.setDate(d.getDate() + 14);
  while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
