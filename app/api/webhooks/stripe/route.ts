import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/app/lib/stripe/stripeClient";
import {
  sendPaymentSuccessEmails,
  sendSubscriptionActivatedEmails,
  sendRenewalSuccessEmails,
  sendPaymentFailedEmails,
  sendSubscriptionCancelledEmails,
  sendRefundEmails,
} from "@/app/lib/email/emailService";

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
    .select("id, customer_id, visits_per_month, frequency, plan_label")
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
    plan_label: string | null;
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
// EMAIL HELPERS (top-level — so they can be called from handlers)
// ─────────────────────────────────────────────────────────────────────────────

async function sendCheckoutEmails(
  supabase: TypedSupabase,
  bookingId: string,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, frequency, plan_label, visits_per_month,
      booking_date, time_slot, final_price, apartment_size,
      stripe_subscription_id, current_period_end,
      customers ( full_name, email, phone )
    `,
    )
    .eq("id", bookingId)
    .single();

  if (!data) {
    console.error(
      `[email] Could not fetch booking ${bookingId} for checkout email:`,
      error?.message ?? "no row returned",
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = data.customers as any;
  const locale = (session.metadata?.locale as "en" | "fi") ?? "en";
  const amountCents =
    session.amount_total ?? Math.round((data.final_price ?? 0) * 100);

  if (session.mode === "payment") {
    await sendPaymentSuccessEmails({
      locale,
      bookingId,
      customerEmail: customer?.email ?? "",
      customerName: customer?.full_name ?? "",
      customerPhone: customer?.phone ?? undefined,
      serviceType: data.plan_label ?? "",
      planLabel: data.plan_label ?? "",
      amountCents,
      currency: session.currency ?? "eur",
      paidAt: new Date().toISOString(),
      stripePaymentIntentId: (session.payment_intent as string) ?? "",
      bookingDate: data.booking_date ?? "",
      timeSlot: data.time_slot ?? "",
      apartmentSize: data.apartment_size ?? "",
    }).catch((err) =>
      console.error(`[email] Payment success email error [${bookingId}]:`, err),
    );
  } else if (session.mode === "subscription") {
    await sendSubscriptionActivatedEmails({
      locale,
      bookingId,
      customerEmail: customer?.email ?? "",
      customerName: customer?.full_name ?? "",
      customerPhone: customer?.phone ?? undefined,
      planLabel: data.plan_label ?? "",
      frequency: data.frequency ?? "",
      visitsPerMonth: data.visits_per_month ?? null,
      firstBillingDate: data.current_period_end ?? new Date().toISOString(),
      stripeSubscriptionId: data.stripe_subscription_id ?? "",
      amountCents,
      currency: session.currency ?? "eur",
    }).catch((err) =>
      console.error(
        `[email] Subscription activated email error [${bookingId}]:`,
        err,
      ),
    );
  }
}

async function sendInvoicePaidEmail(
  supabase: TypedSupabase,
  bookingId: string,
  planLabel: string,
  amountPaid: number,
  currency: string,
  billingPeriodStart: string | null,
  billingPeriodEnd: string | null,
  visitsPerMonth: number | null,
  invoiceId: string,
  billingReason: string | null | undefined,
): Promise<void> {
  // Skip first payment — checkout.session.completed handles that email
  if (billingReason === "subscription_create") return;

  // Fetch customer via booking
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("id", bookingId)
    .single();

  if (!bookingData) return;

  const { data: customerData } = await supabase
    .from("customers")
    .select("email, full_name")
    .eq("id", bookingData.customer_id)
    .single();

  if (!customerData) return;

  sendRenewalSuccessEmails({
    locale: "en",
    bookingId,
    customerEmail: customerData.email,
    customerName: customerData.full_name,
    planLabel: planLabel ?? "",
    amountCents: amountPaid,
    currency,
    billingPeriodStart: billingPeriodStart ?? new Date().toISOString(),
    billingPeriodEnd: billingPeriodEnd ?? new Date().toISOString(),
    visitsCovered: visitsPerMonth,
    stripeInvoiceId: invoiceId,
  }).catch((err) =>
    console.error(`[email] Renewal email error [${bookingId}]:`, err),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: checkout.session.completed
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  supabase: TypedSupabase,
  session: Stripe.Checkout.Session,
): Promise<string | undefined> {
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

  // One-time payments: create payments row immediately

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

  // ── Send confirmation emails (non-blocking) ───────────────────────────────
  await sendCheckoutEmails(supabase, bookingId, session).catch((err) =>
    console.error(`[webhook] Checkout email error [${bookingId}]:`, err),
  );

  return bookingId;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: invoice.paid
// ─────────────────────────────────────────────────────────────────────────────

async function handleInvoicePaid(
  supabase: TypedSupabase,
  invoice: Stripe.Invoice,
): Promise<string | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  const rawSub = inv.subscription as string | { id: string } | null | undefined;
  const subFromLegacy =
    typeof rawSub === "string" ? rawSub : (rawSub?.id ?? null);
  const subFromParent =
    (inv.parent?.subscription_details?.subscription as
      | string
      | null
      | undefined) ?? null;
  const subscriptionId = subFromLegacy ?? subFromParent;

  if (!subscriptionId) {
    console.warn(
      "[webhook] invoice.paid: no subscription ID found in invoice — skipping",
    );
    return;
  }

  console.log(
    `[webhook] invoice.paid: subscriptionId resolved → ${subscriptionId}`,
  );

  // ── Primary lookup ────────────────────────────────────────────────────────
  let booking = await findBookingBySubscription(supabase, subscriptionId);

  // ── Fallback: booking_id from subscription metadata ───────────────────────
  // Race condition: invoice.paid can fire before checkout.session.completed
  // has written stripe_subscription_id to the booking row.
  if (!booking) {
    console.warn(
      `[webhook] invoice.paid: no booking for ${subscriptionId}, trying metadata fallback`,
    );
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const bookingId = sub.metadata?.booking_id;
      if (bookingId) {
        const { data } = await supabase
          .from("bookings")
          .select("id, customer_id, visits_per_month, frequency, plan_label")
          .eq("id", bookingId)
          .single();
        if (data) {
          booking = data as {
            id: string;
            customer_id: string;
            visits_per_month: number | null;
            frequency: string;
            plan_label: string | null;
          };
          await supabase
            .from("bookings")
            .update({ stripe_subscription_id: subscriptionId })
            .eq("id", bookingId);
          console.log(
            `[webhook] invoice.paid: booking ${bookingId} found via metadata, subscription_id patched`,
          );
        }
      }
    } catch (err) {
      console.error("[webhook] invoice.paid metadata fallback error:", err);
    }
  }

  if (!booking) {
    console.warn(
      `[webhook] invoice.paid: booking not found for ${subscriptionId} — skipping`,
    );
    return;
  }

  // ── Billing period (dahlia: lives on items.data[0]) ───────────────────────
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = sub as any;
    const item0 = subAny.items?.data?.[0];
    const cps = (item0?.current_period_start ?? subAny.current_period_start) as
      | number
      | null
      | undefined;
    const cpe = (item0?.current_period_end ?? subAny.current_period_end) as
      | number
      | null
      | undefined;
    if (cps) periodStart = new Date(cps * 1000).toISOString();
    if (cpe) periodEnd = new Date(cpe * 1000).toISOString();
  } catch (err) {
    console.error(
      "[webhook] invoice.paid: failed to fetch subscription period:",
      err,
    );
  }

  const billingReason = (inv.billing_reason ?? invoice.billing_reason) as
    | string
    | null
    | undefined;
  const isFirstPayment = billingReason === "subscription_create";
  const amountPaid = (
    typeof inv.amount_paid === "number"
      ? inv.amount_paid
      : (invoice.amount_paid ?? 0)
  ) as number;
  const invoiceCurrency = (inv.currency ?? invoice.currency ?? "eur") as string;
  const rawPi = inv.payment_intent as
    | string
    | { id: string }
    | null
    | undefined;
  const paymentIntentId =
    typeof rawPi === "string" ? rawPi : (rawPi?.id ?? null);

  console.log(
    `[webhook] invoice.paid — booking: ${booking.id} | ` +
      `period: ${periodStart} → ${periodEnd} | ` +
      `amount: €${(amountPaid / 100).toFixed(2)} | first: ${isFirstPayment}`,
  );

  await supabase.from("payments").insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoice.id,
    amount_cents: amountPaid,
    currency: invoiceCurrency,
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
    `[webhook] Booking ${booking.id} billing period updated: ${periodStart} → ${periodEnd}`,
  );

  // ── Send renewal email (non-blocking, skips subscription_create) ──────────
  sendInvoicePaidEmail(
    supabase,
    booking.id,
    booking.plan_label ?? "",
    amountPaid,
    invoiceCurrency,
    periodStart,
    periodEnd,
    booking.visits_per_month,
    invoice.id,
    billingReason,
  ).catch((err) =>
    console.error(`[webhook] Invoice paid email error [${booking.id}]:`, err),
  );

  // ── SCHEDULING HOOK ───────────────────────────────────────────────────────

  return booking.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: invoice.payment_failed
// ─────────────────────────────────────────────────────────────────────────────

async function handleInvoicePaymentFailed(
  supabase: TypedSupabase,
  invoice: Stripe.Invoice,
): Promise<string | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  const rawSub = inv.subscription as string | { id: string } | null | undefined;
  const subFromLegacy =
    typeof rawSub === "string" ? rawSub : (rawSub?.id ?? null);
  const subFromParent =
    (inv.parent?.subscription_details?.subscription as
      | string
      | null
      | undefined) ?? null;
  const subscriptionId = subFromLegacy ?? subFromParent;

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
    .update({ payment_status: "failed", subscription_status: "past_due" })
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
    sendPaymentFailedEmails({
      locale: "en",
      bookingId: booking.id,
      customerEmail: customerData.email,
      customerName: customerData.full_name,
      planLabel: booking.plan_label ?? "",
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

  const sub = subscription as unknown as Record<string, unknown>;
  const subItems = sub["items"] as Record<string, unknown> | undefined;
  const item0 = (
    subItems?.["data"] as Record<string, unknown>[] | undefined
  )?.[0];
  const cps = (item0?.["current_period_start"] ??
    sub["current_period_start"]) as number | null | undefined;
  const cpe = (item0?.["current_period_end"] ?? sub["current_period_end"]) as
    | number
    | null
    | undefined;

  const updateFields: Record<string, unknown> = {
    subscription_status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (typeof cps === "number")
    updateFields.current_period_start = new Date(cps * 1000).toISOString();
  if (typeof cpe === "number")
    updateFields.current_period_end = new Date(cpe * 1000).toISOString();

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
    sendSubscriptionCancelledEmails({
      locale: "en",
      bookingId: booking.id,
      customerEmail: customerData.email,
      customerName: customerData.full_name,
      planLabel: booking.plan_label ?? "",
      canceledAt: new Date().toISOString(),
      accessUntil: null,
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

  const p = payment as Record<string, unknown>;
  const paymentId = p["id"] as string;
  const bookingId = p["booking_id"] as string;
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
    .eq("id", paymentId);

  if (isFullRefund) {
    await supabase
      .from("bookings")
      .update({ payment_status: "refunded" })
      .eq("id", bookingId);
  }

  console.log(
    `[webhook] Charge refunded. Amount: ${refundedAmount} cents. Full: ${isFullRefund}`,
  );

  // ── Send refund emails (non-blocking) ─────────────────────────────────────
  try {
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("customer_id, plan_label")
      .eq("id", bookingId)
      .single();

    if (bookingData) {
      const bd = bookingData as Record<string, unknown>;
      const { data: customerData } = await supabase
        .from("customers")
        .select("email, full_name")
        .eq("id", bd["customer_id"] as string)
        .single();

      if (customerData) {
        const cd = customerData as Record<string, unknown>;
        sendRefundEmails({
          locale: "en",
          bookingId,
          customerEmail: cd["email"] as string,
          customerName: cd["full_name"] as string,
          refundAmountCents: refundedAmount,
          currency: "eur",
          refundedAt: new Date().toISOString(),
          stripeRefundId: latestRefund?.id ?? "",
          isFullRefund,
        }).catch((err) =>
          console.error(`[webhook] Refund email error [${bookingId}]:`, err),
        );
      }
    }
  } catch (err) {
    console.error(`[webhook] Refund email lookup error [${bookingId}]:`, err);
  }

  return bookingId;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WEBHOOK ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const stripe = getStripe();

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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook] Signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { alreadyProcessed } = await logWebhookEvent(supabase, event);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: "duplicate" });
  }

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
  }

  await markProcessed(supabase, event.id, relatedBookingId, processingError);
  return NextResponse.json({ received: true });
}
