"use server";
// app/actions/manageSubscription.ts

import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../lib/stripe/stripeClient";
import type {
  CancelSubscriptionInput,
  CancelSubscriptionResult,
} from "../lib/stripe/types";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Cancel subscription (graceful — at period end) ────────────────────────────

export async function cancelSubscriptionAtPeriodEnd(
  input: CancelSubscriptionInput,
): Promise<CancelSubscriptionResult> {
  const { bookingId, stripeSubId } = input;
  const supabase = getSupabase();
  const stripe = getStripe();

  try {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end",
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: `Booking ${bookingId} not found` };
    }

    if (booking.stripe_subscription_id !== stripeSubId) {
      return {
        success: false,
        error: "Subscription ID does not match booking",
      };
    }

    if (booking.cancel_at_period_end) {
      return {
        success: false,
        error: "Subscription is already scheduled for cancellation",
      };
    }

    if (booking.subscription_status === "canceled") {
      return { success: false, error: "Subscription is already canceled" };
    }

    // Stripe SDK v18 removed current_period_end from the Subscription return type.
    // It still exists at runtime — cast to any to access it safely.

    const updatedSub = (await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

    const periodEnd = updatedSub.current_period_end as
      | number
      | null
      | undefined;

    console.log(
      `[stripe] Cancellation scheduled for subscription ${stripeSubId}. ` +
        `Active until: ${new Date((periodEnd ?? 0) * 1000).toISOString()}`,
    );

    // Optimistic DB update — webhook will also confirm via customer.subscription.updated
    await supabase
      .from("bookings")
      .update({ cancel_at_period_end: true })
      .eq("id", bookingId);

    const accessUntil = periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : undefined;

    return {
      success: true,
      canceledAt: new Date().toISOString(),
      accessUntil,
    };
  } catch (err) {
    console.error(
      `[stripe] cancelSubscriptionAtPeriodEnd failed [${bookingId}]:`,
      err,
    );
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error canceling subscription",
    };
  }
}

// ── Undo scheduled cancellation (reactivate) ─────────────────────────────────

export async function reactivateSubscription(
  bookingId: string,
  stripeSubId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const stripe = getStripe();

  try {
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "stripe_subscription_id, cancel_at_period_end, subscription_status",
      )
      .eq("id", bookingId)
      .single();

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.stripe_subscription_id !== stripeSubId)
      return { success: false, error: "Subscription ID mismatch" };
    if (!booking.cancel_at_period_end)
      return {
        success: false,
        error: "Subscription is not scheduled for cancellation",
      };
    if (booking.subscription_status === "canceled")
      return {
        success: false,
        error: "Subscription is already canceled and cannot be reactivated",
      };

    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: false,
    });

    await supabase
      .from("bookings")
      .update({ cancel_at_period_end: false })
      .eq("id", bookingId);

    console.log(
      `[stripe] Cancellation reversed for subscription ${stripeSubId}`,
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to reactivate subscription",
    };
  }
}

// ── Immediate cancellation (admin only) ──────────────────────────────────────

export async function cancelSubscriptionImmediately(
  bookingId: string,
  stripeSubId: string,
  adminNote: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const stripe = getStripe();

  if (!adminNote?.trim()) {
    return {
      success: false,
      error: "Admin note is required for immediate cancellation",
    };
  }

  try {
    await stripe.subscriptions.cancel(stripeSubId);

    await supabase
      .from("bookings")
      .update({
        subscription_status: "canceled",
        cancel_at_period_end: false,
        canceled_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    console.log(
      `[stripe] IMMEDIATE cancellation of ${stripeSubId} by admin. Note: ${adminNote}`,
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to cancel subscription",
    };
  }
}

// ── Get subscription status (for UI display) ──────────────────────────────────

export async function getSubscriptionStatus(bookingId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      frequency,
      visits_per_month,
      subscription_status,
      payment_status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      canceled_at,
      stripe_subscription_id,
      plan_label
    `,
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    isActive: data.subscription_status === "active",
    isPastDue: data.subscription_status === "past_due",
    isCanceled: data.subscription_status === "canceled",
    isCanceledSoon: data.cancel_at_period_end === true,
    nextBillingDate: data.current_period_end,
    canCancel:
      data.subscription_status === "active" && !data.cancel_at_period_end,
    canReactivate:
      data.cancel_at_period_end === true &&
      data.subscription_status !== "canceled",
  };
}
