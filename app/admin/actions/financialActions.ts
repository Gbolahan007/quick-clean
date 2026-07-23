"use server";
// app/admin/actions/financialActions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { withAdmin } from "@/app/lib/supabase/admin";
import { writeAuditLog, AUDIT_ACTIONS } from "@/app/lib/admin/auditLog";
import { getStripe } from "@/app/lib/stripe/stripeClient";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// issueRefund
// ─────────────────────────────────────────────────────────────────────────────

export const issueRefund = withAdmin(
  async (
    admin,
    paymentId: string,
    reason: string,
    amountCents?: number, // undefined = full refund
  ) => {
    if (!paymentId) throw new Error("paymentId is required");
    if (!reason.trim()) throw new Error("Refund reason is required");

    const supabase = getServiceClient();

    // Fetch the payment row
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select(
        "id, booking_id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, status, currency",
      )
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) throw new Error("Payment not found");
    if (payment.status === "refunded")
      throw new Error("Payment has already been fully refunded");
    if (!payment.stripe_payment_intent_id) {
      throw new Error(
        "This payment cannot be refunded. Please contact support.",
      );
    }

    const refundAmount = amountCents ?? payment.amount_cents;

    if (refundAmount <= 0)
      throw new Error("Refund amount must be greater than zero");
    if (refundAmount > payment.amount_cents) {
      throw new Error(
        `Refund amount (€${(refundAmount / 100).toFixed(2)}) exceeds payment amount (€${(payment.amount_cents / 100).toFixed(2)})`,
      );
    }

    const isFullRefund = refundAmount === payment.amount_cents;

    // ── Call Stripe ───────────────────────────────────────────────────────────
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmount,
      reason: "requested_by_customer",
    });

    // ── Update payments row ───────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: isFullRefund ? "refunded" : "partially_refunded",
        stripe_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error(
        "[financialActions] Failed to update payment after refund:",
        updateError.message,
      );
    }

    // ── Update booking payment_status if fully refunded ───────────────────────
    if (isFullRefund && payment.booking_id) {
      await supabase
        .from("bookings")
        .update({
          payment_status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.booking_id);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
      entityType: "payment",
      entityId: paymentId,
      beforeSnapshot: {
        status: payment.status,
        amount_cents: payment.amount_cents,
      },
      afterSnapshot: {
        status: isFullRefund ? "refunded" : "partially_refunded",
        refund_id: refund.id,
        refund_amount: refundAmount,
      },
      metadata: { reason, isFullRefund, bookingId: payment.booking_id },
    });

    revalidatePath("/admin/payments");
    revalidatePath(`/admin/bookings/${payment.booking_id}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// cancelSubscription (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const adminCancelSubscription = withAdmin(
  async (admin, bookingId: string, immediately: boolean = false) => {
    if (!bookingId) throw new Error("bookingId is required");

    const supabase = getServiceClient();

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        "id, stripe_subscription_id, subscription_status, cancel_at_period_end",
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) throw new Error("Booking not found");
    if (!booking.stripe_subscription_id)
      throw new Error("No active subscription on this booking");
    if (booking.subscription_status === "canceled")
      throw new Error("Subscription is already cancelled");

    const stripe = getStripe();
    const beforeSnapshot = { ...booking };

    if (immediately) {
      await stripe.subscriptions.cancel(booking.stripe_subscription_id);
      await supabase
        .from("bookings")
        .update({
          subscription_status: "canceled",
          cancel_at_period_end: false,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    } else {
      await stripe.subscriptions.update(booking.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      await supabase
        .from("bookings")
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
      entityType: "subscription",
      entityId: bookingId,
      beforeSnapshot: beforeSnapshot as Record<string, unknown>,
      afterSnapshot: {
        immediately,
        cancel_at_period_end: !immediately,
        canceled_at: immediately ? new Date().toISOString() : null,
      },
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/bookings/${bookingId}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// reactivateSubscription (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const adminReactivateSubscription = withAdmin(
  async (admin, bookingId: string) => {
    if (!bookingId) throw new Error("bookingId is required");

    const supabase = getServiceClient();

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        "id, stripe_subscription_id, subscription_status, cancel_at_period_end",
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) throw new Error("Booking not found");
    if (!booking.stripe_subscription_id)
      throw new Error("No subscription on this booking");
    if (!booking.cancel_at_period_end)
      throw new Error("Subscription is not pending cancellation");

    const stripe = getStripe();

    await stripe.subscriptions.update(booking.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await supabase
      .from("bookings")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.SUBSCRIPTION_REACTIVATED,
      entityType: "subscription",
      entityId: bookingId,
      afterSnapshot: { cancel_at_period_end: false },
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/bookings/${bookingId}`);
  },
);
