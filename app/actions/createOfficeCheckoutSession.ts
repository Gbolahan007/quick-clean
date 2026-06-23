"use server";

import { createClient } from "@supabase/supabase-js";
import {
  getStripe,
  getOrCreateStripeCustomer,
} from "../lib/stripe/stripeClient";
import type Stripe from "stripe";

export interface CreateOfficeCheckoutInput {
  bookingId: string;
  customerId: string;
  customerEmail: string;
  locale: "en" | "fi";
  successPath: string;
  cancelPath: string;
}

export type CreateOfficeCheckoutResult =
  | { success: true; sessionId: string; checkoutUrl: string }
  | { success: false; error: string; code: string };

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createOfficeCheckoutSession(
  input: CreateOfficeCheckoutInput,
): Promise<CreateOfficeCheckoutResult> {
  const {
    bookingId,
    customerId,
    customerEmail,
    locale,
    successPath,
    cancelPath,
  } = input;

  const supabase = getSupabase();
  const stripe = getStripe();
  const baseUrl = getBaseUrl();

  try {
    // ── 1. Fetch booking — all pricing from DB, never from client ─────────
    const { data: booking, error: bookingLookupError } = await supabase
      .from("bookings")
      .select(
        `
        id, status, payment_status,
        stripe_checkout_session_id, customer_id,
        plan_label, estimated_hours, hourly_rate_cents,
        quoted_amount_cents, monthly_estimate,
        stripe_product_id, addons_snapshot
      `,
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

    // ── 2. Guard: no double-charging ──────────────────────────────────────
    if (booking.status === "confirmed" || booking.payment_status === "paid") {
      return {
        success: false,
        error: "Booking is already paid",
        code: "ALREADY_PAID",
      };
    }

    // ── 3. Reuse open session if one exists ───────────────────────────────
    if (booking.stripe_checkout_session_id) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(
          booking.stripe_checkout_session_id,
        );
        if (existing.status === "open") {
          console.log(`[stripe:office] Reusing open session: ${existing.id}`);
          return {
            success: true,
            sessionId: existing.id,
            checkoutUrl: existing.url!,
          };
        }
      } catch {
        /* expired or not found — create new */
      }
    }

    // ── 4. Resolve amount from DB ─────────────────────────────────────────
    const b = booking as Record<string, unknown>;
    // SOURCE OF TRUTH: monthly_estimate = serverPricing.finalMonthly + addons.
    // This is the TRUE monthly cost (weekly_hours × hourly_rate × WEEKS_PER_MONTH + surcharge).
    // DO NOT use quoted_amount_cents — that is weekly cost only (hours × hourly_rate_cents).
    const monthlyEstimate = b["monthly_estimate"] as number | null;
    const estimatedHoursFromDb = b["estimated_hours"] as number | null;
    const hourlyRateCentsFromDb = b["hourly_rate_cents"] as number | null;

    console.log(
      `[stripe:office] DB values — monthly_estimate: €${monthlyEstimate} | ` +
        `estimated_hours: ${estimatedHoursFromDb}h | hourly_rate_cents: ${hourlyRateCentsFromDb}¢ | ` +
        `weekly_cost_check: €${((estimatedHoursFromDb ?? 0) * ((hourlyRateCentsFromDb ?? 0) / 100)).toFixed(2)}`,
    );

    const quotedCents = Math.round((monthlyEstimate ?? 0) * 100);

    if (!quotedCents || quotedCents <= 0) {
      return {
        success: false,
        error: `Invalid monthly_estimate on booking (got: ${monthlyEstimate}). Check submitOfficeBookingAction.`,
        code: "INVALID_AMOUNT",
      };
    }

    console.log(
      `[stripe:office] Stripe charge: €${(quotedCents / 100).toFixed(2)}/month`,
    );

    // ── Add-ons ────────────────────────────────────────────────────────────
    const addonsSnapshot = b["addons_snapshot"] as Record<
      string,
      unknown
    > | null;
    const addonsTotal =
      (addonsSnapshot?.["discountedTotal"] as number | null) ?? 0;
    const addonNames = (addonsSnapshot?.["names"] as string[] | null) ?? [];
    const addonCents = Math.round(addonsTotal * 100);

    // ── 5. Stripe Product ID ──────────────────────────────────────────────
    const officeProductId = process.env.STRIPE_PRODUCT_OFFICE_CLEANING;
    if (!officeProductId) {
      throw new Error(
        "STRIPE_PRODUCT_OFFICE_CLEANING env var not set. " +
          "Create a product in Stripe dashboard and add prod_xxx to .env.local",
      );
    }

    // ── 6. Get or create Stripe Customer ──────────────────────────────────
    // FIXED: correct param name is platformCustomerId, not customerId
    // Fetch customer full_name from DB for Stripe customer record
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

    // ── 7. Build line items ───────────────────────────────────────────────
    // Use Stripe.Checkout.SessionCreateParams.LineItem directly — avoids
    // the conditional type inference issue with typeof sessions.create params.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          unit_amount: quotedCents,
          product: officeProductId,
          recurring: { interval: "month", interval_count: 1 },
        },
        quantity: 1,
      },
    ];

    if (addonCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          unit_amount: addonCents,
          product_data: {
            name: "Add-on services",
            description:
              addonNames.length > 0
                ? addonNames.join(", ")
                : "Selected add-ons",
          },
          recurring: { interval: "month", interval_count: 1 },
        },
        quantity: 1,
      });
    }

    // ── 8. Create Stripe Checkout Session ─────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: lineItems,

      metadata: {
        booking_id: bookingId,
        customer_id: customerId,
        locale,
        service_type: "office",
      },

      subscription_data: {
        metadata: {
          booking_id: bookingId,
          customer_id: customerId,
        },
      },

      success_url: `${baseUrl}/${locale}${successPath}?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${baseUrl}/${locale}${cancelPath}?booking_id=${bookingId}`,
    });

    console.log(
      `[stripe:office] Session created: ${session.id} | url: ${session.url} | amount: €${(quotedCents / 100).toFixed(2)}/month`,
    );

    if (!session.url) {
      throw new Error(
        "Stripe returned a session with no URL — cannot redirect customer",
      );
    }

    // ── 9. Persist session ID to booking ──────────────────────────────────
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_product_id: officeProductId,
      })
      .eq("id", bookingId);

    if (updateError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      throw new Error(`Failed to persist session ID: ${updateError.message}`);
    }

    return { success: true, sessionId: session.id, checkoutUrl: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Stripe error";
    console.error(`[stripe:office] fatal [${bookingId}]:`, msg);
    return { success: false, error: msg, code: "STRIPE_ERROR" };
  }
}
