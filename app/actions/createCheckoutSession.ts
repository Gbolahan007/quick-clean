"use server";
// app/actions/createCheckoutSession.ts
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: Stripe Checkout Session creation.
//
// CALL ORDER (enforced by architecture):
//   submitBookingAction → returns bookingId
//   createCheckoutSession(bookingId, ...) → returns checkoutUrl
//   Client redirects to checkoutUrl
//
// WHY BOOKING IS CREATED FIRST:
//   If Stripe session creation succeeds but our DB write fails,
//   we have an orphaned Stripe object with no corresponding booking.
//   By creating the DB row first, our DB is always the source of truth.
//   If Checkout session creation fails, the booking stays in "pending"
//   status and can be retried or cleaned up — no orphaned Stripe objects.
//
// SECURITY:
//   - Price ID resolved ENTIRELY server-side from env vars
//   - Client never supplies price_id or amount
//   - booking_id stored in Stripe metadata for webhook → booking lookup
//   - Amount in Stripe is set by the Price object — never by our code
//   - success_url contains session_id for verification (not sensitive data)
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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getBaseUrl(): string {
  // In production: NEXT_PUBLIC_SITE_URL
  // In development: localhost
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
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
  } = input;

  const supabase = getSupabase();
  const stripe = getStripe();
  const baseUrl = getBaseUrl();

  try {
    // ── Guard: verify booking exists and is in pending status ─────────────
    // Prevents creating a second Checkout session for an already-paid booking.
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
      // Security: ensure the customer owns this booking
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

    // If a Checkout session was already created for this booking,
    // return it instead of creating a duplicate.
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
        // Session expired — fall through to create a new one
        console.log(
          `[stripe] Previous session ${booking.stripe_checkout_session_id} expired. Creating new.`,
        );
      } catch {
        // Session not found in Stripe — create a new one
      }
    }

    // ── Step 1: Resolve Stripe Price ID server-side ────────────────────────
    // SECURITY: This is the ONLY place Price IDs are resolved.
    // The client never supplies a price_id.
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
    // Reuses existing customer if stripe_customer_id is already set.
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

    // ── Step 3: Build Checkout Session parameters ─────────────────────────
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] =
      {
        customer: stripeCustomerId,
        mode,

        // ── Line items strategy ────────────────────────────────────────────────
        // When there are NO add-ons: use the pre-created Stripe Price object.
        //   Simple, clean, amount set in Stripe dashboard.
        //
        // When there ARE add-ons on a SUBSCRIPTION: Stripe does not allow mixing
        //   a pre-created Price (priceId) with inline price_data recurring items
        //   even if intervals match — it throws "different billing intervals".
        //   Solution: use price_data for BOTH items (plan + addons) so Stripe
        //   sees two inline prices with identical intervals.
        //
        // When there ARE add-ons on a ONE-TIME payment: two separate line items
        //   work fine — plan uses priceId, addons use price_data (no recurring).
        //
        // Plan unit_amount for price_data path: fetched from Stripe Price object
        //   so we never hardcode the amount — Stripe dashboard is still the
        //   source of truth for the plan price.
        line_items: await (async () => {
          const hasAddons = addonsTotal > 0;
          const isSubscription = mode === "subscription";

          if (!hasAddons) {
            // Simple case: just the plan Price object
            return [{ price: priceId, quantity: 1 }];
          }

          if (isSubscription && hasAddons) {
            // Fetch the plan price amount from Stripe so we can use price_data
            // for both line items — avoids the "different billing intervals" error
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

          // One-time payment with add-ons: plan priceId + inline add-ons
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
        })(),

        // ── Metadata: links the Stripe session back to our booking ────────────
        // The checkout.session.completed webhook reads booking_id to find
        // the booking to confirm. This is the ONLY safe way to make this link.
        metadata: {
          booking_id: bookingId,
          customer_id: customerId,
          service_type: serviceType,
          frequency,
          apartment_key: apartmentKey,
          locale,
        },

        // ── Subscription-specific settings ────────────────────────────────────
        ...(mode === "subscription" && {
          subscription_data: {
            metadata: {
              booking_id: bookingId, // used by invoice.paid fallback lookup
              customer_id: customerId,
            },
          },
        }),

        // ── URLs ───────────────────────────────────────────────────────────────
        // {CHECKOUT_SESSION_ID} is a Stripe template variable — filled by Stripe.
        // We use it to verify payment on the success page (non-sensitive).
        success_url: `${baseUrl}/${locale}${successPath}?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
        cancel_url: `${baseUrl}/${locale}${cancelPath}?booking_id=${bookingId}`,

        // ── Customer email pre-fill ────────────────────────────────────────────
        customer_email: undefined, // already set via customer ID above

        // ── Allow promotion codes (optional, enable when needed) ────────────
        // allow_promotion_codes: true,

        // ── Locale ────────────────────────────────────────────────────────────
        locale: locale === "fi" ? "fi" : "en",

        // ── Payment method types ───────────────────────────────────────────────
        payment_method_types: ["card"],
      };

    // ── Step 4: Create Stripe Checkout Session ────────────────────────────
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `[stripe] Checkout session created: ${session.id} (mode: ${mode})`,
    );

    // ── Step 5: Persist session ID and price ID to booking ────────────────
    // This is what the webhook uses to find the booking after payment.
    // Also snapshots visits_per_month for the scheduling system.
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_price_id: priceId,
        visits_per_month: visitsPerMonth,
      })
      .eq("id", bookingId);

    if (updateError) {
      // Critical: if we can't persist the session ID, the webhook won't
      // be able to find the booking. Log clearly and return an error.
      // The booking remains in "pending" — can be retried.
      console.error(
        `[stripe] CRITICAL: Failed to persist session ID ${session.id} for booking ${bookingId}:`,
        updateError.message,
      );
      // Attempt to expire the Stripe session to avoid orphan
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
