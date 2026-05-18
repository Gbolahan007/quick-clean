"use server";
// actions/submitOfficeBooking.ts
// Server action for office booking — extends existing submitBookingAction pattern.
// Reuses: customers, addresses tables.
// Extends: bookings table (office columns).
// New: office_schedule_rules table.

import { createClient } from "@supabase/supabase-js";
import { officeBookingSubmitSchema } from "../schema/officeBooking";
import {
  calculateOfficePricing,
  validateScheduleHours,
} from "../../app/[locale]/pricing/data/lib/officePricing";
import type { OfficeBookingResult } from "../types/office";
import type { OfficeBookingSubmitPayload } from "../types/office";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function submitOfficeBookingAction(
  payload: OfficeBookingSubmitPayload,
): Promise<OfficeBookingResult> {
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
    // ── 2. Authoritative pricing recalculation ─────────────────────────────
    // NEVER trust client-calculated prices — always recalculate server-side.
    const serverPricing = calculateOfficePricing(
      data.weeklyHoursInput,
      data.eveningWeekendSurcharge,
    );

    // Validate schedule hours match declared weekly hours
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
        number_of_rooms: Math.ceil(data.officeSizeSqm / 25), // estimated rooms
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

    // ── 6. Duplicate office booking guard ──────────────────────────────────
    // Office bookings are recurring contracts — prevent double-contracting
    // the same customer for the same service at the same address.
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

    // ── 7. Determine first booking_date ────────────────────────────────────
    // Use the first scheduled day starting at least 14 days out.
    // This gives the team time to confirm before the first visit.
    const firstBookingDate = getFirstScheduledDate(data.recurringRules);
    const defaultStartTime = data.recurringRules[0]?.startTime ?? "08:00";

    // ── 8. Insert booking ──────────────────────────────────────────────────
    // Only writes columns that exist in the schema.
    // Skipped for MVP: workspace_type, staff_count, pricing_tier
    // Add those columns to the schema migration before writing them here.
    const serverMonthly = serverPricing.finalMonthly + data.addonsMonthlyTotal;
    const serverBasePrice = serverPricing.monthlyCost;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        // ── Core relations ─────────────────────────────────────────────────
        customer_id: customerId,
        service_id: serviceRecord.id,
        address_id: addressRecord.id,
        subscription_plan_id: null, // Stripe subscription created separately

        // ── Scheduling ─────────────────────────────────────────────────────
        booking_date: firstBookingDate,
        time_slot: defaultStartTime,

        // ── Status ─────────────────────────────────────────────────────────
        status: "pending",
        payment_status: "pending",
        frequency: "weekly", // office contracts are always weekly recurring

        // ── Pricing ────────────────────────────────────────────────────────
        final_price: serverMonthly,
        base_price: serverBasePrice,

        // ── Service snapshot ───────────────────────────────────────────────
        service_type: "office",
        plan_key: data.planKey,
        plan_label: data.planLabel,
        show_deducted: false, // no household deduction for office

        // ── Apartment snapshot (repurposed for office context) ─────────────
        apartment_key: "office",
        apartment_label: `${data.officeSizeSqm} m²`, // size as the label
        apartment_size: `${data.officeSizeSqm} m²`,

        // ── Addons snapshot ────────────────────────────────────────────────
        addons_snapshot: {
          count: data.selectedAddons.length,
          rawTotal: data.addonsMonthlyTotal,
          discount: 0,
          discountedTotal: data.addonsMonthlyTotal,
          names: data.selectedAddons,
        },

        // ── Notes ──────────────────────────────────────────────────────────
        special_notes: data.specialNotes,

        // ── Office-specific columns ────────────────────────────────────────
        // These 7 columns exist in the schema. Skipped columns
        // (workspace_type, staff_count, pricing_tier) are NOT written here
        // because they don't exist in the schema yet. Add the ALTER TABLE
        // migration first if you need them.
        office_name: data.officeName,
        office_size_sqm: data.officeSizeSqm,
        weekly_hours: serverPricing.weeklyHours,
        hourly_rate: serverPricing.hourlyRate,
        recurring_time: defaultStartTime,
        evening_weekend_surcharge: data.eveningWeekendSurcharge,
        monthly_estimate: serverMonthly,
      })
      .select("id")
      .single();

    if (bookingError)
      throw new Error(`Booking insertion: ${bookingError.message}`);

    console.log("[submitOfficeBookingAction] Booking created:", booking.id);

    // ── 9. Insert office_schedule_rules ────────────────────────────────────
    // One row per recurring day — the contract schedule.
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
      // Non-fatal but important — log for ops team to fix manually
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

    // ── 10. TODO: Create Stripe recurring subscription ─────────────────────
    // When Stripe is wired:
    //   const stripeSession = await createStripeSubscription({
    //     customerId,
    //     bookingId:     booking.id,
    //     amountCents:   toStripeCents(serverMonthly),
    //     customerEmail: data.email,
    //     planLabel:     data.planLabel,
    //   });
    //
    //   await supabase
    //     .from("bookings")
    //     .update({ stripe_subscription_id: stripeSession.subscriptionId })
    //     .eq("id", booking.id);
    //
    //   return { success: true, bookingId: booking.id, customerId, stripeSessionUrl: stripeSession.url };

    // ── 11. Return ─────────────────────────────────────────────────────────
    return {
      success: true,
      bookingId: booking.id,
      customerId,
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

// ── Helper: first scheduled date ──────────────────────────────────────────────
// Returns the next occurrence of the first scheduled day, at least 14 days out.
function getFirstScheduledDate(rules: { dayOfWeek: number }[]): string {
  if (rules.length === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }

  const targetDay = rules[0].dayOfWeek;
  const d = new Date();
  d.setDate(d.getDate() + 14);

  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1);
  }

  return d.toISOString().slice(0, 10);
}
