"use server";
// app/actions/createCheckoutSession.ts
// ─────────────────────────────────────────────────────────────────────────────
// v4 change: accepts optional stripeCouponId.
// When present, passed to Stripe as discounts: [{ coupon: stripeCouponId }].
// Stripe applies the discount to line items and shows the breakdown in the UI.
// The coupon is never constructed here — it is always a pre-created Stripe
// Coupon object whose ID was snapshotted from the vouchers table or the
// STRIPE_COUPON_FIRST_BOOKING env var.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import {
  getStripe,
  getOrCreateStripeCustomer,
} from "../lib/stripe/stripeClient";
import {
  resolveStripePrice,
  resolveVisitsPerMonth,
} from "../lib/stripe/priceResolver";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
} from "../lib/stripe/types";
import type Stripe from "stripe";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createCheckoutSession(
  input: CreateCheckoutInput & { stripeCouponId?: string },
): Promise<CreateCheckoutResult> {
  const {
    bookingId,
    customerId,
    customerEmail,
    serviceType,
    frequency,
    apartmentKey,
    locale,
    successPath,
    cancelPath,
    addonsTotal = 0,
    addonNames = [],
    stripeCouponId,
  } = input;

  const supabase = getSupabase();
  const stripe = getStripe();
  const baseUrl = getBaseUrl();

  try {
    // ── Guard: verify booking exists and is pending ───────────────────────
    const { data: booking, error: bookingLookupError } = await supabase
      .from("bookings")
      .select(
        "id, status, payment_status, stripe_checkout_session_id, customer_id",
      )
      .eq("id", bookingId)
      .single();

    if (bookingLookupError || !booking) {
      return {
        success: false,
        error: `Booking ${bookingId} not found`,
        code: "BOOKING_NOT_FOUND",
      };
    }

    if (booking.customer_id !== customerId) {
      return {
        success: false,
        error: "This booking does not belong to the specified customer",
        code: "BOOKING_OWNERSHIP_MISMATCH",
      };
    }

    if (booking.status === "confirmed" || booking.payment_status === "paid") {
      return {
        success: false,
        error: "This booking has already been paid",
        code: "ALREADY_PAID",
      };
    }

    // Reuse an existing open session if present
    if (booking.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          booking.stripe_checkout_session_id,
        );
        if (existingSession.status === "open") {
          console.log(
            `[stripe] Reusing existing Checkout session: ${existingSession.id}`,
          );
          return {
            success: true,
            checkoutUrl: existingSession.url!,
            sessionId: existingSession.id,
            priceId: existingSession.line_items?.data?.[0]?.price?.id ?? "",
          };
        }
        console.log(
          `[stripe] Previous session ${booking.stripe_checkout_session_id} expired. Creating new.`,
        );
      } catch {
        // Session not found in Stripe — fall through to create a new one
      }
    }

    // ── Step 1: Resolve Stripe Price ID server-side ───────────────────────
    let resolved;
    try {
      resolved = resolveStripePrice({ serviceType, frequency, apartmentKey });
    } catch (priceError) {
      return {
        success: false,
        error:
          priceError instanceof Error
            ? priceError.message
            : "Price configuration error",
        code: "PRICE_NOT_CONFIGURED",
      };
    }

    const { priceId, mode, intervalCount } = resolved;
    const visitsPerMonth = resolveVisitsPerMonth(frequency);

    // ── Step 2: Get or create Stripe Customer ─────────────────────────────
    const { data: customerRecord } = await supabase
      .from("customers")
      .select("full_name, phone")
      .eq("id", customerId)
      .single();

    const { stripeCustomerId } = await getOrCreateStripeCustomer({
      platformCustomerId: customerId,
      email: customerEmail,
      fullName: customerRecord?.full_name ?? customerEmail,
      phone: customerRecord?.phone ?? undefined,
    });

    // ── Step 3: Build line items ──────────────────────────────────────────
    const hasAddons = addonsTotal > 0;
    const isSubscription = mode === "subscription";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      await (async () => {
        if (!hasAddons) {
          return [{ price: priceId, quantity: 1 }];
        }

        if (isSubscription && hasAddons) {
          const planPrice = await stripe.prices.retrieve(priceId);
          const planCents = planPrice.unit_amount ?? 0;

          return [
            {
              price_data: {
                currency: "eur",
                unit_amount: planCents,
                product_data: {
                  name:
                    addonNames.length > 0
                      ? `${planPrice.nickname ?? "Cleaning plan"} + add-ons`
                      : (planPrice.nickname ?? "Cleaning plan"),
                  description:
                    addonNames.length > 0
                      ? `Plan + ${addonNames.join(", ")}`
                      : undefined,
                },
                recurring: {
                  interval: "month" as const,
                  interval_count: intervalCount,
                },
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: "eur",
                unit_amount: Math.round(addonsTotal * 100),
                product_data: {
                  name: "Add-on services",
                  description: addonNames.join(", ") || "Selected add-ons",
                },
                recurring: {
                  interval: "month" as const,
                  interval_count: intervalCount,
                },
              },
              quantity: 1,
            },
          ];
        }

        // One-time payment with add-ons
        return [
          { price: priceId, quantity: 1 },
          {
            price_data: {
              currency: "eur",
              unit_amount: Math.round(addonsTotal * 100),
              product_data: {
                name: "Add-on services",
                description: addonNames.join(", ") || "Selected add-ons",
              },
            },
            quantity: 1,
          },
        ];
      })();

    // ── Step 4: Build session params ──────────────────────────────────────
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode,
      line_items: lineItems,

      // ── Discount (v4) ─────────────────────────────────────────────────────
      // Applied when a first-booking or voucher discount won.
      // Stripe applies the coupon to all line items and shows the breakdown.
      // NOTE: When discounts is set, allow_promotion_codes must be omitted —
      // Stripe does not allow both on the same session.
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),

      metadata: {
        booking_id: bookingId,
        customer_id: customerId,
        service_type: serviceType,
        frequency,
        apartment_key: apartmentKey,
        locale,
      },

      ...(mode === "subscription" && {
        subscription_data: {
          metadata: {
            booking_id: bookingId,
            customer_id: customerId,
          },
        },
      }),

      success_url: `${baseUrl}/${locale}${successPath}?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${baseUrl}/${locale}${cancelPath}?booking_id=${bookingId}`,

      locale: locale === "fi" ? "fi" : "en",
      payment_method_types: ["card"],
    };

    // ── Step 5: Create session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(
      `[stripe] Checkout session created: ${session.id} (mode: ${mode})${stripeCouponId ? ` coupon: ${stripeCouponId}` : ""}`,
    );

    // ── Step 6: Persist session ID to booking ─────────────────────────────
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_price_id: priceId,
        visits_per_month: visitsPerMonth,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error(
        `[stripe] CRITICAL: Failed to persist session ID ${session.id} for booking ${bookingId}:`,
        updateError.message,
      );
      await stripe.checkout.sessions.expire(session.id).catch(() => null);
      return {
        success: false,
        error: "Failed to save payment session. Please try again.",
        code: "SESSION_PERSIST_FAILED",
      };
    }

    return {
      success: true,
      checkoutUrl: session.url!,
      sessionId: session.id,
      priceId,
    };
  } catch (err) {
    console.error("[stripe] createCheckoutSession fatal:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error creating payment session.",
      code: "STRIPE_ERROR",
    };
  }
}
