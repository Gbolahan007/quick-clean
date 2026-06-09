"use server";
// app/actions/submitBooking.ts
// ─────────────────────────────────────────────────────────────────────────────
// Residential booking server action.
//
// STRIPE INTEGRATION (added):
//   After the booking row is created, we:
//     1. Create/reuse a Stripe Customer (stored on customers.stripe_customer_id)
//     2. Create a Stripe Checkout Session
//     3. Store stripe_checkout_session_id + stripe_price_id + visits_per_month
//     4. Return checkoutUrl for the client to redirect to
//
//   EMAIL CHANGE:
//     Confirmation email is NO LONGER sent here.
//     It fires from the checkout.session.completed webhook handler instead,
//     because the customer has not paid yet at this point.
//     The booking is still "pending" until the webhook confirms it.
//
// ORDER GUARANTEE:
//   DB booking is always created BEFORE any Stripe call.
//   If Stripe session creation fails, the booking stays pending
//   and no orphaned Stripe objects are created.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { bookingSubmitSchema } from "../schema/bookingSubmit";
import { BookingSubmitPayload } from "../types/api";
import { createCheckoutSession } from "./createCheckoutSession";

// Updated result type includes checkoutUrl
export type BookingSubmitResult =
  | {
      success: true;
      bookingId: string;
      customerId: string;
      checkoutUrl: string;
    }
  | { success: false; error: string; code: string };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

const ADDON_TYPE_MAP: Record<string, string> = {
  "Window cleaning": "windows",

  "Oven cleaning": "oven",
  "Oven interior": "oven_interior",

  "Fridge cleaning": "fridge",
  "Fridge / freezer interior": "fridge",

  "Deep clean": "deep_clean",
  "High dusting": "high_dust",

  "Trash cabinet interior": "trash_cabinet",

  "Sauna cleaning": "sauna",

  Ironing: "ironing",
  "Ironing (5–7 shirts)": "ironing",

  Laundry: "laundry",
  "Laundry (per load)": "laundry",
};

export async function submitBookingAction(
  payload: BookingSubmitPayload,
): Promise<BookingSubmitResult> {
  // ── 1. Validate ────────────────────────────────────────────────────────────
  const parsed = bookingSubmitSchema.safeParse(payload);
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
    // ── 2. Find or create customer ─────────────────────────────────────────
    let customerId: string;

    const { data: existing, error: lookupError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (lookupError)
      throw new Error(`Customer lookup failed: ${lookupError.message}`);

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
        throw new Error(`Customer creation failed: ${createError.message}`);
      customerId = created.id;
    }

    console.log("[submitBookingAction] Customer:", customerId);

    // ── 3. Insert address ──────────────────────────────────────────────────
    const { data: addressRecord, error: addressError } = await supabase
      .from("addresses")
      .insert({
        customer_id: customerId,
        street_address: data.streetAddress,
        apartment_number: data.apartmentNumber ?? null,
        city: data.city,
        postal_code: data.postalCode,
        square_meters: data.squareMeters,
        number_of_rooms: data.numberOfRooms,
        access_instructions: data.accessInstructions ?? null,
        is_default: true,
      })
      .select("id")
      .single();

    if (addressError)
      throw new Error(`Address insertion failed: ${addressError.message}`);

    // ── 4. Server-side slot re-validation ─────────────────────────────────
    const { data: slotRecord, error: slotLookupError } = await supabase
      .from("availability_slots")
      .select(
        "id, start_time, end_time, max_bookings, is_available, day_of_week",
      )
      .eq("id", data.slotId)
      .single();

    if (slotLookupError || !slotRecord) {
      return {
        success: false,
        error:
          "The selected time slot no longer exists. Please choose another.",
        code: "SLOT_NOT_FOUND",
      };
    }
    if (!slotRecord.is_available) {
      return {
        success: false,
        error: "This time slot has been disabled. Please choose another.",
        code: "SLOT_DISABLED",
      };
    }

    const selectedDayOfWeek = new Date(data.bookingDate + "T12:00:00").getDay();
    if (selectedDayOfWeek !== slotRecord.day_of_week) {
      return {
        success: false,
        error: "The selected time slot does not match the booking date.",
        code: "SLOT_DATE_MISMATCH",
      };
    }

    const slotStartTime = slotRecord.start_time.slice(0, 5);

    const { count: currentBookings, error: countError } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_date", data.bookingDate)
      .eq("time_slot", slotStartTime)
      .neq("status", "cancelled");

    if (countError)
      throw new Error(`Slot count check failed: ${countError.message}`);

    if ((currentBookings ?? 0) >= slotRecord.max_bookings) {
      return {
        success: false,
        error: "This time slot just filled up. Please choose another.",
        code: "SLOT_FULL",
      };
    }

    const { data: duplicate } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_id", customerId)
      .eq("booking_date", data.bookingDate)
      .eq("time_slot", slotStartTime)
      .neq("status", "cancelled")
      .maybeSingle();

    if (duplicate) {
      return {
        success: false,
        error: "You already have a booking at this date and time.",
        code: "DUPLICATE_BOOKING",
      };
    }

    console.log(
      "[submitBookingAction] Slot validated:",
      slotStartTime,
      "on",
      data.bookingDate,
    );

    // ── 5. Resolve service_id ──────────────────────────────────────────────
    const { data: serviceRecord, error: serviceError } = await supabase
      .from("services")
      .select("id, slug, name_en")
      .eq("slug", data.serviceType)
      .eq("is_active", true)
      .single();

    if (serviceError || !serviceRecord) {
      const { data: allServices } = await supabase
        .from("services")
        .select("id, slug, name_en, is_active");
      console.error(
        "[submitBookingAction] Service lookup failed.",
        "\n  Looking for slug:",
        data.serviceType,
        "\n  Services in DB:",
        JSON.stringify(allServices, null, 2),
        "\n  Supabase error:",
        serviceError?.message ?? "none",
      );
      throw new Error(
        `Service not found for slug: "${data.serviceType}". ` +
          `Available: ${allServices?.map((s) => s.slug).join(", ") ?? "none"}`,
      );
    }

    console.log(
      "[submitBookingAction] Service:",
      serviceRecord.name_en,
      "→",
      serviceRecord.id,
    );

    // ── 6. Resolve subscription_plan_id ───────────────────────────────────
    let subscriptionPlanId: string | null = null;

    if (data.frequency !== "one-time") {
      const { data: planRecord } = await supabase
        .from("subscription_plans")
        .select("id, name")
        .eq("frequency", data.frequency)
        .eq("is_active", true)
        .maybeSingle();
      subscriptionPlanId = planRecord?.id ?? null;
      console.log(
        "[submitBookingAction] Plan:",
        planRecord?.name ?? "none (one-time)",
      );
    }

    // ── 7. Insert booking ──────────────────────────────────────────────────
    // status = "pending" intentionally — it becomes "confirmed" only after
    // the checkout.session.completed webhook fires (payment confirmed).
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customerId,
        service_id: serviceRecord.id,
        address_id: addressRecord.id,
        subscription_plan_id: subscriptionPlanId,
        booking_date: data.bookingDate,
        time_slot: slotStartTime,
        status: "pending",
        payment_status: "pending",
        frequency: data.frequency,
        final_price: data.finalPrice,
        base_price: data.basePrice,
        service_type: data.serviceType,
        plan_key: data.planKey,
        plan_label: data.planLabel,
        show_deducted: data.showDeducted,
        apartment_key: data.apartmentKey,
        apartment_label: data.apartmentLabel,
        apartment_size: data.apartmentSize,
        addons_snapshot: data.addonsSnapshot,
        special_notes: data.specialNotes,
      })
      .select("id, created_at")
      .single();

    if (bookingError)
      throw new Error(`Booking insertion failed: ${bookingError.message}`);

    console.log("[submitBookingAction] Booking created:", booking.id);

    // ── 8. Insert booking_extras ───────────────────────────────────────────
    if (data.addonsSnapshot.count > 0 && data.addonsSnapshot.names.length > 0) {
      const extrasRows = data.addonsSnapshot.names
        .map((name) => {
          const baseName = name.replace(/\s×\d+$/, "").trim();
          const extraType = ADDON_TYPE_MAP[baseName];
          if (!extraType) {
            console.warn(
              "[submitBookingAction] Unrecognised addon name:",
              baseName,
            );
            return null;
          }
          return { booking_id: booking.id, extra_type: extraType, price: 0 };
        })
        .filter(Boolean);

      if (extrasRows.length > 0) {
        const { error: extrasError } = await supabase
          .from("booking_extras")
          .insert(extrasRows);
        if (extrasError) {
          console.warn(
            "[submitBookingAction] booking_extras warning:",
            extrasError.message,
          );
        } else {
          console.log(
            "[submitBookingAction] booking_extras inserted:",
            extrasRows.length,
            "rows",
          );
        }
      }
    }

    // ── 9. Create Stripe Checkout Session ─────────────────────────────────
    // DB booking exists first (step 7). Now we create the Stripe session.
    // If this fails, the booking stays pending — no orphaned Stripe objects.
    //
    // NOTE: Email is NOT sent here. Confirmation email fires from the
    // checkout.session.completed webhook after the customer actually pays.
    const checkoutResult = await createCheckoutSession({
      bookingId: booking.id,
      customerId,
      customerEmail: data.email,
      serviceType: data.serviceType,
      frequency: data.frequency,
      apartmentKey: data.apartmentKey,
      locale: (data.locale as "en" | "fi") ?? "en",
      successPath: "/booking/success",
      cancelPath: "/booking/cancelled",
      addonsTotal: data.addonsSnapshot.discountedTotal,
      addonNames: data.addonsSnapshot.names,
    });

    if (!checkoutResult.success) {
      // Checkout session creation failed. The booking remains pending.
      // Customer can retry. No orphaned Stripe objects exist.
      console.error(
        `[submitBookingAction] Stripe checkout failed for booking ${booking.id}:`,
        checkoutResult.error,
      );
      return {
        success: false,
        error: checkoutResult.error,
        code: checkoutResult.code,
      };
    }

    console.log(
      `[submitBookingAction] Checkout session created: ${checkoutResult.sessionId} → ${booking.id}`,
    );

    // ── 10. Return checkout URL for client redirect ────────────────────────
    return {
      success: true,
      bookingId: booking.id,
      customerId,
      checkoutUrl: checkoutResult.checkoutUrl,
    };
  } catch (err) {
    console.error("[submitBookingAction] Fatal:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error. Please try again.",
      code: "SERVER_ERROR",
    };
  }
}
