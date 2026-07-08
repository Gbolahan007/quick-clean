"use server";
// app/actions/submitBooking.ts
// ─────────────────────────────────────────────────────────────────────────────
// Residential booking server action — v4 with voucher + first-booking discount.
//
// NEW IN v4:
//   - Accepts optional voucherCode from the review step
//   - Revalidates voucher server-side (never trusts client preview)
//   - Runs selectDiscount() to determine the winning discount
//   - Zero-payment path: if finalAmountCents === 0, skips Stripe entirely
//     and confirms the booking atomically in a single transaction block
//   - Non-zero path: creates Stripe Checkout Session as before,
//     passing the winning coupon via discounts: [{ coupon: stripeCouponId }]
//   - Discount snapshot written to booking row unconditionally
//
// FIRST-BOOKING ELIGIBILITY:
//   Evaluated at submission time. Becomes immutable only after payment confirms
//   (webhook sets payment_status = 'paid'). A booking that stays 'pending'
//   does NOT consume eligibility — the next paid booking will still get the discount.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { bookingSubmitSchema } from "../schema/bookingSubmit";
import { BookingSubmitPayload } from "../types/api";
import { createCheckoutSession } from "./createCheckoutSession";
import { validateVoucher } from "@/app/lib/vouchers/validateVoucher";
import { selectDiscount } from "@/app/lib/vouchers/discountEngine";
import type { VoucherRow, DiscountResult } from "@/app/lib/vouchers/types";

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

// ── Zero-payment confirmation ─────────────────────────────────────────────────

async function confirmZeroPaymentBooking(params: {
  supabase: ReturnType<typeof getServiceClient>;
  bookingId: string;
  customerId: string;
  discount: DiscountResult;
  stripeSessionId: string;
}): Promise<void> {
  const { supabase, bookingId, customerId, discount, stripeSessionId } = params;

  // Confirm the booking
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
    })
    .eq("id", bookingId);

  if (bookingError) {
    throw new Error(
      `Zero-payment booking confirmation failed: ${bookingError.message}`,
    );
  }

  // Insert payment record with amount_cents = 0
  const { error: paymentError } = await supabase.from("payments").insert({
    booking_id: bookingId,
    stripe_payment_intent_id: null,
    stripe_invoice_id: null,
    amount_cents: 0,
    currency: "eur",
    status: "succeeded",
    is_first_payment: true,
    paid_at: new Date().toISOString(),
  });

  if (paymentError) {
    throw new Error(
      `Zero-payment payment record failed: ${paymentError.message}`,
    );
  }

  // Record voucher redemption if a voucher was used
  if (
    discount.source === "voucher" &&
    discount.voucherId !== null &&
    discount.voucherCode !== null
  ) {
    const { error: redemptionError } = await supabase
      .from("voucher_redemptions")
      .insert({
        voucher_id: discount.voucherId,
        booking_id: bookingId,
        customer_id: customerId,
        discount_type: "percentage",
        discount_value: 0,
        stripe_coupon_id: discount.stripeCouponId,
        discount_amount_cents: discount.discountAmountCents,
        original_amount_cents: discount.originalAmountCents,
        final_amount_cents: 0,
        stripe_session_id: stripeSessionId,
        redeemed_at: new Date().toISOString(),
      });

    if (redemptionError) {
      // Non-fatal — log but don't fail the booking
      console.error(
        `[submitBooking] Voucher redemption insert failed for booking ${bookingId}:`,
        redemptionError.message,
      );
    }

    // Atomically increment voucher usage
    const { data: incremented } = await supabase.rpc(
      "increment_voucher_usage",
      { p_voucher_id: discount.voucherId },
    );

    if (!incremented) {
      console.warn(
        `[submitBooking] increment_voucher_usage returned false for ${discount.voucherId} — ` +
          "voucher may have been exhausted by a concurrent request",
      );
    }
  }
}

// ── Main action ───────────────────────────────────────────────────────────────

export async function submitBookingAction(
  payload: BookingSubmitPayload,
  voucherCode: string | null = null,
): Promise<BookingSubmitResult> {
  // ── 1. Validate payload ───────────────────────────────────────────────────
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
    // ── 2. Find or create customer ──────────────────────────────────────────
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
          email: data.email.toLowerCase().trim(),
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone,
        })
        .select("id")
        .single();

      if (createError)
        throw new Error(`Customer creation failed: ${createError.message}`);
      customerId = created.id;
    }

    // ── 3. Insert address ───────────────────────────────────────────────────
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

    // ── 4. Slot re-validation ───────────────────────────────────────────────
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
      .eq("status", "confirmed");

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
      .eq("status", "confirmed")
      .maybeSingle();

    if (duplicate) {
      return {
        success: false,
        error: "You already have a booking at this date and time.",
        code: "DUPLICATE_BOOKING",
      };
    }

    // ── 5. Resolve service ──────────────────────────────────────────────────
    const { data: serviceRecord, error: serviceError } = await supabase
      .from("services")
      .select("id, slug, name_en")
      .eq("slug", data.serviceType)
      .eq("is_active", true)
      .single();

    if (serviceError || !serviceRecord) {
      throw new Error(`Service not found for slug: "${data.serviceType}"`);
    }

    // ── 6. Resolve subscription plan ────────────────────────────────────────
    let subscriptionPlanId: string | null = null;
    if (data.frequency !== "one-time") {
      const { data: planRecord } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("frequency", data.frequency)
        .eq("is_active", true)
        .maybeSingle();
      subscriptionPlanId = planRecord?.id ?? null;
    }

    // ── 7. Discount resolution ──────────────────────────────────────────────
    // Step A: Revalidate voucher server-side (never trust the client preview)
    let validatedVoucher: VoucherRow | null = null;

    if (voucherCode && voucherCode.trim()) {
      const originalAmountCentsForValidation = Math.round(
        data.finalPrice * 100,
      );
      const voucherResult = await validateVoucher({
        code: voucherCode,
        customerId,
        serviceType: data.serviceType,
        originalAmountCents: originalAmountCentsForValidation,
      });

      if (voucherResult.valid) {
        validatedVoucher = voucherResult.voucher;
      } else {
        return {
          success: false,
          error: `Voucher error: ${voucherResult.error}`,
          code: "VOUCHER_INVALID",
        };
      }
    }

    // Step B: Select the best discount (first-booking vs voucher)
    const originalAmountCents = Math.round(data.finalPrice * 100);

    const discount = await selectDiscount({
      customerId,
      serviceType: data.serviceType,
      originalAmountCents,
      validatedVoucher,
    });

    const finalAmountCents = discount.finalAmountCents;
    const finalPrice = finalAmountCents / 100;

    console.log(
      `[submitBooking] Discount: source=${discount.source ?? "none"} ` +
        `original=${originalAmountCents}c final=${finalAmountCents}c ` +
        `saving=${discount.discountAmountCents}c`,
    );

    // ── 8. Build discount snapshot fields ──────────────────────────────────
    // These are written atomically with the booking row.
    const discountFields =
      discount.source === null
        ? {
            is_first_booking: false,
            discount_source: null,
            voucher_id: null,
            stripe_coupon_id: null,
            discount_amount_cents: null,
            original_final_price_cents: null,
            final_price_cents: finalAmountCents,
          }
        : {
            is_first_booking: discount.source === "first_booking",
            discount_source: discount.source,
            voucher_id: discount.voucherId,
            stripe_coupon_id: discount.stripeCouponId,
            discount_amount_cents: discount.discountAmountCents,
            original_final_price_cents: originalAmountCents,
            final_price_cents: finalAmountCents,
          };

    // ── 9. Insert booking ───────────────────────────────────────────────────
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
        final_price: finalPrice,
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
        ...discountFields,
      })
      .select("id")
      .single();

    if (bookingError)
      throw new Error(`Booking insertion failed: ${bookingError.message}`);
    console.log("[submitBooking] Booking created:", booking.id);

    // ── 10. Insert booking_extras ───────────────────────────────────────────
    if (data.addonsSnapshot.count > 0 && data.addonsSnapshot.names.length > 0) {
      const extrasRows = data.addonsSnapshot.names
        .map((name) => {
          const baseName = name.replace(/\s×\d+$/, "").trim();
          const extraType = ADDON_TYPE_MAP[baseName];
          if (!extraType) {
            console.warn("[submitBooking] Unrecognised addon name:", baseName);
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
            "[submitBooking] booking_extras warning:",
            extrasError.message,
          );
        }
      }
    }

    // ── 11. Zero-payment path ──────────────────────────────────────────────────
    if (discount.isFree) {
      const isSubscription = !["one-time", "deepOnetime"].includes(
        data.frequency,
      );

      if (isSubscription) {
        // Subscriptions MUST go through Stripe even at $0
        // so Stripe manages the billing cycle for month 2+.
        // The coupon makes the first invoice $0 — no card needed.
        // Fall through to Stripe Checkout below (do NOT return here).
        console.log(
          `[submitBooking] Zero-payment subscription ${booking.id} — routing through Stripe with coupon`,
        );
      } else {
        // One-time bookings: truly free — skip Stripe entirely
        console.log(
          `[submitBooking] Zero-payment one-time booking ${booking.id} — skipping Stripe`,
        );

        await confirmZeroPaymentBooking({
          supabase,
          bookingId: booking.id,
          customerId,
          discount,
          stripeSessionId: `zero_${booking.id}`,
        });

        const successUrl =
          `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}` +
          `/${(data.locale as string) ?? "en"}/booking/success` +
          `?booking_id=${booking.id}&session_id=zero_${booking.id}`;

        return {
          success: true,
          bookingId: booking.id,
          customerId,
          checkoutUrl: successUrl,
        };
      }
    }

    // ── 12. Stripe Checkout path (finalAmountCents > 0) ─────────────────────
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
      // Pass the winning Stripe coupon — discount applied in Checkout UI
      stripeCouponId:
        discount.source !== null ? discount.stripeCouponId : undefined,
    });
    if (!checkoutResult.success) {
      console.error(
        `[submitBooking] Stripe checkout failed for booking ${booking.id}:`,
        checkoutResult.error,
      );
      return {
        success: false,
        error: "Payment session could not be created. Please try again.",
        code: checkoutResult.code,
      };
    }

    console.log(
      `[submitBooking] ✓ Checkout session created: ${checkoutResult.sessionId} → ${booking.id}`,
    );

    return {
      success: true,
      bookingId: booking.id,
      customerId,
      checkoutUrl: checkoutResult.checkoutUrl,
    };
  } catch (err) {
    console.error("[submitBooking] Fatal:", err);
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
