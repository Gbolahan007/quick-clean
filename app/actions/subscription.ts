"use server";
// app/actions/subscription.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stripe subscription management server actions.
// All actions verify booking ownership via RLS before calling Stripe.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createServerClient,
  createServiceClient,
} from "@/app/lib/supabase/server";
import { getStripe } from "@/app/lib/stripe/stripeClient";

export type SubscriptionActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

// ── Verify the authenticated user owns this booking ───────────────────────────
async function verifyBookingOwnership(bookingId: string): Promise<{
  owned: boolean;
  stripeSubscriptionId: string | null;
}> {
  const supabase = await createServerClient();

  // RLS automatically scopes this to the authenticated user's bookings.
  // If the booking doesn't belong to them, .single() returns null.
  const { data } = await supabase
    .from("bookings")
    .select("id, stripe_subscription_id")
    .eq("id", bookingId)
    .single();

  return {
    owned: !!data,
    stripeSubscriptionId: data?.stripe_subscription_id ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelSubscription
// Sets cancel_at_period_end=true — subscription stays active until period ends
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelSubscription(
  bookingId: string,
): Promise<SubscriptionActionResult> {
  const { owned, stripeSubscriptionId } =
    await verifyBookingOwnership(bookingId);

  if (!owned) {
    return { success: false, error: "Booking not found." };
  }
  if (!stripeSubscriptionId) {
    return {
      success: false,
      error: "No active subscription found for this booking.",
    };
  }

  const stripe = getStripe();

  try {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local DB immediately (webhook will also update, but this gives
    // instant UI feedback without waiting for Stripe webhook delivery)
    const serviceSupabase = createServiceClient();
    await serviceSupabase
      .from("bookings")
      .update({ cancel_at_period_end: true })
      .eq("id", bookingId);

    return {
      success: true,
      message:
        "Your subscription will cancel at the end of the current billing period.",
    };
  } catch (err) {
    console.error("[subscription] cancelSubscription error:", err);
    return {
      success: false,
      error: "Failed to cancel subscription. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// reactivateSubscription
// Removes cancel_at_period_end — subscription continues normally
// ─────────────────────────────────────────────────────────────────────────────

export async function reactivateSubscription(
  bookingId: string,
): Promise<SubscriptionActionResult> {
  const { owned, stripeSubscriptionId } =
    await verifyBookingOwnership(bookingId);

  if (!owned) {
    return { success: false, error: "Booking not found." };
  }
  if (!stripeSubscriptionId) {
    return {
      success: false,
      error: "No active subscription found for this booking.",
    };
  }

  const stripe = getStripe();

  try {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    const serviceSupabase = createServiceClient();
    await serviceSupabase
      .from("bookings")
      .update({ cancel_at_period_end: false })
      .eq("id", bookingId);

    return {
      success: true,
      message: "Your subscription has been reactivated.",
    };
  } catch (err) {
    console.error("[subscription] reactivateSubscription error:", err);
    return {
      success: false,
      error: "Failed to reactivate subscription. Please try again.",
    };
  }
}
