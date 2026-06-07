import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/app/lib/stripe/stripeClient";
import {
  sendPaymentFailedEmail,
  sendSubscriptionEndedEmail,
} from "@/app/lib/email/emailServices";

// ── Typed Supabase client ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypedSupabase = SupabaseClient<any>;

function getSupabase(): TypedSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Idempotency ───────────────────────────────────────────────────────────────

async function logWebhookEvent(
  supabase: TypedSupabase,
  event: Stripe.Event,
): Promise<{ alreadyProcessed: boolean }> {
  const { error } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processed: false,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique constraint — already processed
      console.log(
        `[webhook] Duplicate event skipped: ${event.id} (${event.type})`,
      );
      return { alreadyProcessed: true };
    }
    console.error(`[webhook] Failed to log event ${event.id}:`, error.message);
  }

  return { alreadyProcessed: false };
}

async function markProcessed(
  supabase: TypedSupabase,
  stripeEventId: string,
  relatedBookingId?: string,
  processingError?: string,
) {
  await supabase
    .from("stripe_webhook_events")
    .update({
      processed: !processingError,
      processing_error: processingError ?? null,
      processed_at: new Date().toISOString(),
      related_booking_id: relatedBookingId ?? null,
    })
    .eq("stripe_event_id", stripeEventId);
}

// ── Booking lookups ───────────────────────────────────────────────────────────

async function findBookingBySubscription(
  supabase: TypedSupabase,
  subId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_id, visits_per_month, frequency")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();

  if (error)
    throw new Error(
      `Booking lookup by subscription failed (${subId}): ${error.message}`,
    );
  return data as {
    id: string;
    customer_id: string;
    visits_per_month: number | null;
    frequency: string;
  } | null;
}

async function findBookingBySession(
  supabase: TypedSupabase,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, frequency, visits_per_month, stripe_subscription_id, status",
    )
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  if (error)
    throw new Error(
      `Booking lookup by session failed (${sessionId}): ${error.message}`,
    );
  return data as {
    id: string;
    customer_id: string;
    frequency: string;
    visits_per_month: number | null;
    stripe_subscription_id: string | null;
    status: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: checkout.session.completed
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  supabase: TypedSupabase,
  session: Stripe.Checkout.Session,
): Promise<string | undefined> {
  // booking_id was stored in metadata when the Checkout Session was created
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) {
    throw new Error(
      `No booking_id in session metadata for session ${session.id}`,
    );
  }

  const isSubscription = session.mode === "subscription";
  const isPayment = session.mode === "payment";

  const updateFields: Record<string, unknown> = {
    status: "confirmed",
    payment_status: "paid",
  };

  if (isPayment && session.payment_intent) {
    updateFields.stripe_payment_intent_id = session.payment_intent as string;
  }

  if (isSubscription && session.subscription) {
    updateFields.stripe_subscription_id = session.subscription as string;
    updateFields.subscription_status = "active";
    // current_period_start/end set by invoice.paid handler
  }

  const { error } = await supabase
    .from("bookings")
    .update(updateFields)
    .eq("id", bookingId);

  if (error)
    throw new Error(`Failed to confirm booking ${bookingId}: ${error.message}`);

  console.log(
    `[webhook] Booking ${bookingId} confirmed (mode: ${session.mode})`,
  );

  // One-time payments: create the payments row immediately
  // Subscriptions: invoice.paid handler creates the payments row
  if (isPayment && session.payment_intent && session.amount_total) {
    await supabase.from("payments").insert({
      booking_id: bookingId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount_cents: session.amount_total,
      currency: session.currency ?? "eur",
      status: "succeeded",
      is_first_payment: true,
      paid_at: new Date().toISOString(),
    });
  }

  return bookingId;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: invoice.paid
// ─────────────────────────────────────────────────────────────────────────────

async function handleInvoicePaid(
  supabase: TypedSupabase,
  invoice: Stripe.Invoice,
): Promise<string | undefined> {
  // Stripe SDK v18 removed `subscription` and `payment_intent` from the Invoice
  // type definition. They still exist at runtime — cast to any to access them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  const rawSub = inv.subscription as string | { id: string } | null | undefined;
  const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id;

  if (!subscriptionId) return; // not a subscription invoice

  const booking = await findBookingBySubscription(supabase, subscriptionId);
  if (!booking) {
    console.warn(
      `[webhook] No booking found for subscription ${subscriptionId}`,
    );
    return;
  }

  const periodStart = invoice.period_start
    ? new Date(invoice.period_start * 1000).toISOString()
    : null;
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : null;

  const isFirstPayment = invoice.billing_reason === "subscription_create";

  const rawPi = inv.payment_intent as
    | string
    | { id: string }
    | null
    | undefined;
  const paymentIntentId =
    typeof rawPi === "string" ? rawPi : (rawPi?.id ?? null);

  await supabase.from("payments").insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency ?? "eur",
    status: "succeeded",
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    visits_covered: booking.visits_per_month,
    is_first_payment: isFirstPayment,
    paid_at: new Date().toISOString(),
  });

  await supabase
    .from("bookings")
    .update({
      payment_status: "paid",
      subscription_status: "active",
      current_period_start: periodStart,
      current_period_end: periodEnd,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", booking.id);

  console.log(
    `[webhook] Invoice paid for booking ${booking.id}. ` +
      `Period: ${periodStart} → ${periodEnd}. ` +
      `Visits to schedule: ${booking.visits_per_month ?? "N/A"}`,
  );

  // ── SCHEDULING HOOK ───────────────────────────────────────────────────────
  // Generate visit slots here when the scheduling system is ready.
  // Use: booking.frequency, booking.visits_per_month, periodStart, periodEnd

  return booking.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: invoice.payment_failed
// ─────────────────────────────────────────────────────────────────────────────

async function handleInvoicePaymentFailed(
  supabase: TypedSupabase,
  invoice: Stripe.Invoice,
): Promise<string | undefined> {
  // Same as handleInvoicePaid — cast to any for removed Invoice fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  const rawSub = inv.subscription as string | { id: string } | null | undefined;
  const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id;

  if (!subscriptionId) return;

  const booking = await findBookingBySubscription(supabase, subscriptionId);
  if (!booking) return;

  const failureMessage =
    invoice.last_finalization_error?.message ??
    "Payment failed. Please update your payment method.";

  const rawPi = inv.payment_intent as
    | string
    | { id: string }
    | null
    | undefined;
  const paymentIntentId =
    typeof rawPi === "string" ? rawPi : (rawPi?.id ?? null);

  await supabase.from("payments").insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due,
    currency: invoice.currency ?? "eur",
    status: "failed",
    failure_message: failureMessage,
  });

  await supabase
    .from("bookings")
    .update({
      payment_status: "failed",
      subscription_status: "past_due",
    })
    .eq("id", booking.id);

  console.log(
    `[webhook] Payment failed for booking ${booking.id}: ${failureMessage}`,
  );

  const { data: customerData } = await supabase
    .from("customers")
    .select("email, full_name")
    .eq("id", booking.customer_id)
    .single();

  if (customerData) {
    sendPaymentFailedEmail({
      customerEmail: customerData.email,
      customerName: customerData.full_name,
      bookingId: booking.id,
      failureReason: failureMessage,
    }).catch((err) =>
      console.error(
        `[webhook] Payment failed email error [${booking.id}]:`,
        err,
      ),
    );
  }

  return booking.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: customer.subscription.updated
// ─────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionUpdated(
  supabase: TypedSupabase,
  subscription: Stripe.Subscription,
): Promise<string | undefined> {
  const booking = await findBookingBySubscription(supabase, subscription.id);
  if (!booking) return;

  // current_period_start and current_period_end exist on Stripe.Subscription
  // but TypeScript may not always resolve them — access via index to be safe
  const sub = subscription as unknown as Record<string, unknown>;

  const updateFields: Record<string, unknown> = {
    subscription_status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (typeof sub["current_period_start"] === "number") {
    updateFields.current_period_start = new Date(
      (sub["current_period_start"] as number) * 1000,
    ).toISOString();
  }
  if (typeof sub["current_period_end"] === "number") {
    updateFields.current_period_end = new Date(
      (sub["current_period_end"] as number) * 1000,
    ).toISOString();
  }

  await supabase.from("bookings").update(updateFields).eq("id", booking.id);

  console.log(
    `[webhook] Subscription updated for booking ${booking.id}: ` +
      `status=${subscription.status} cancel_at_period_end=${subscription.cancel_at_period_end}`,
  );

  return booking.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: customer.subscription.deleted
// ─────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionDeleted(
  supabase: TypedSupabase,
  subscription: Stripe.Subscription,
): Promise<string | undefined> {
  const booking = await findBookingBySubscription(supabase, subscription.id);
  if (!booking) return;

  await supabase
    .from("bookings")
    .update({
      subscription_status: "canceled",
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  console.log(`[webhook] Subscription canceled for booking ${booking.id}`);

  const { data: customerData } = await supabase
    .from("customers")
    .select("email, full_name")
    .eq("id", booking.customer_id)
    .single();

  if (customerData) {
    sendSubscriptionEndedEmail({
      customerEmail: customerData.email,
      customerName: customerData.full_name,
      bookingId: booking.id,
    }).catch((err) =>
      console.error(
        `[webhook] Subscription ended email error [${booking.id}]:`,
        err,
      ),
    );
  }

  return booking.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: charge.refunded
// ─────────────────────────────────────────────────────────────────────────────

async function handleChargeRefunded(
  supabase: TypedSupabase,
  charge: Stripe.Charge,
): Promise<string | undefined> {
  if (!charge.payment_intent) return;

  const piId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent as Stripe.PaymentIntent).id;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id, amount_cents")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();

  if (!payment) {
    console.warn(`[webhook] No payment found for payment_intent ${piId}`);
    return;
  }

  const refundedAmount = charge.amount_refunded;
  const isFullRefund = refundedAmount >= charge.amount;
  const latestRefund = charge.refunds?.data?.[0];

  await supabase
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      stripe_refund_id: latestRefund?.id ?? null,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", (payment as Record<string, unknown>)["id"] as string);

  if (isFullRefund) {
    await supabase
      .from("bookings")
      .update({ payment_status: "refunded" })
      .eq("id", (payment as Record<string, unknown>)["booking_id"] as string);
  }

  console.log(
    `[webhook] Charge refunded. Amount: ${refundedAmount} cents. Full: ${isFullRefund}`,
  );

  return (payment as Record<string, unknown>)["booking_id"] as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WEBHOOK ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const stripe = getStripe();

  // ── 1. Raw body — required for signature verification ─────────────────────
  const rawBody = await req.arrayBuffer();
  const body = Buffer.from(rawBody);
  const sig = req.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  // ── 2. Signature verification (FIRST — rejects forged events) ─────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook] Signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 3. Idempotency check ──────────────────────────────────────────────────
  const { alreadyProcessed } = await logWebhookEvent(supabase, event);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: "duplicate" });
  }

  // ── 4. Route to handler ───────────────────────────────────────────────────
  let relatedBookingId: string | undefined;
  let processingError: string | undefined;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        relatedBookingId = await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "invoice.paid":
        relatedBookingId = await handleInvoicePaid(
          supabase,
          event.data.object as Stripe.Invoice,
        );
        break;

      case "invoice.payment_failed":
        relatedBookingId = await handleInvoicePaymentFailed(
          supabase,
          event.data.object as Stripe.Invoice,
        );
        break;

      case "customer.subscription.updated":
        relatedBookingId = await handleSubscriptionUpdated(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        relatedBookingId = await handleSubscriptionDeleted(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;

      case "charge.refunded":
        relatedBookingId = await handleChargeRefunded(
          supabase,
          event.data.object as Stripe.Charge,
        );
        break;

      case "checkout.session.expired":
        console.log(
          `[webhook] Checkout session expired: ${(event.data.object as Stripe.Checkout.Session).id}`,
        );
        break;

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    processingError = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[webhook] Handler error for ${event.type} (${event.id}):`,
      processingError,
    );
    // Return 200 — Stripe should not retry bugs. Error is logged for ops review.
  }

  // ── 5. Mark processed ─────────────────────────────────────────────────────
  await markProcessed(supabase, event.id, relatedBookingId, processingError);

  return NextResponse.json({ received: true });
}
