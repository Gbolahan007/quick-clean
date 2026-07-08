"use server";
// app/admin/actions/bookingActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Admin server actions for booking management.
// Every mutation: 1) verifies admin, 2) performs action, 3) writes audit log.
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

// ── Fetch single booking (used inside actions for before_snapshot) ─────────────

async function getBookingSnapshot(bookingId: string) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, status, booking_date, time_slot, stripe_subscription_id, cancel_at_period_end",
    )
    .eq("id", bookingId)
    .single();
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelBooking
// ─────────────────────────────────────────────────────────────────────────────

export const cancelBooking = withAdmin(
  async (
    admin,
    bookingId: string,
    reason: string,
    cancelStripeImmediately: boolean = false,
  ) => {
    if (!bookingId) throw new Error("bookingId is required");
    if (!reason?.trim()) throw new Error("Cancellation reason is required");

    const supabase = getServiceClient();
    const beforeSnapshot = await getBookingSnapshot(bookingId);

    if (!beforeSnapshot) throw new Error("Booking not found");
    if (beforeSnapshot.status === "cancelled") {
      throw new Error("Booking is already cancelled");
    }

    // ── Cancel Stripe subscription if applicable ──────────────────────────────
    if (beforeSnapshot.stripe_subscription_id) {
      const stripe = getStripe();
      if (cancelStripeImmediately) {
        await stripe.subscriptions.cancel(
          beforeSnapshot.stripe_subscription_id,
        );
      } else {
        await stripe.subscriptions.update(
          beforeSnapshot.stripe_subscription_id,
          {
            cancel_at_period_end: true,
          },
        );
      }
    }

    // ── Update booking ────────────────────────────────────────────────────────
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancel_at_period_end: !cancelStripeImmediately,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw new Error(`Failed to cancel booking: ${error.message}`);

    // ── Audit log ─────────────────────────────────────────────────────────────
    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.BOOKING_CANCELLED,
      entityType: "booking",
      entityId: bookingId,
      beforeSnapshot: beforeSnapshot as Record<string, unknown>,
      afterSnapshot: {
        status: "cancelled",
        canceled_at: new Date().toISOString(),
      },
      metadata: { reason, cancelStripeImmediately },
    });

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// rescheduleBooking
// ─────────────────────────────────────────────────────────────────────────────

export const rescheduleBooking = withAdmin(
  async (
    admin,
    bookingId: string,
    newDate: string, // YYYY-MM-DD
    newTimeSlot: string, // HH:MM
    reason: string,
  ) => {
    if (!bookingId) throw new Error("bookingId is required");
    if (!newDate) throw new Error("New date is required");
    if (!newTimeSlot) throw new Error("New time slot is required");
    if (!reason?.trim()) throw new Error("Reschedule reason is required");

    const supabase = getServiceClient();
    const beforeSnapshot = await getBookingSnapshot(bookingId);

    if (!beforeSnapshot) throw new Error("Booking not found");

    // ── Validate new slot availability ────────────────────────────────────────
    const { count: existing } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_date", newDate)
      .eq("time_slot", newTimeSlot)
      .eq("status", "confirmed")
      .neq("id", bookingId); // exclude the booking being rescheduled

    if ((existing ?? 0) > 0) {
      throw new Error("The selected time slot is already booked");
    }

    // ── Update booking ────────────────────────────────────────────────────────
    const { error } = await supabase
      .from("bookings")
      .update({
        booking_date: newDate,
        time_slot: newTimeSlot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error)
      throw new Error(`Failed to reschedule booking: ${error.message}`);

    // ── Audit log ─────────────────────────────────────────────────────────────
    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.BOOKING_RESCHEDULED,
      entityType: "booking",
      entityId: bookingId,
      beforeSnapshot: {
        booking_date: beforeSnapshot.booking_date,
        time_slot: beforeSnapshot.time_slot,
      },
      afterSnapshot: {
        booking_date: newDate,
        time_slot: newTimeSlot,
      },
      metadata: { reason },
    });

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// addBookingNote
// ─────────────────────────────────────────────────────────────────────────────

export const addBookingNote = withAdmin(
  async (admin, bookingId: string, note: string) => {
    if (!bookingId) throw new Error("bookingId is required");
    if (!note?.trim()) throw new Error("Note cannot be empty");

    const supabase = getServiceClient();

    const { error } = await supabase.from("booking_notes").insert({
      booking_id: bookingId,
      admin_id: admin.id,
      note: note.trim(),
    });

    if (error) throw new Error(`Failed to add note: ${error.message}`);

    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.BOOKING_NOTE_ADDED,
      entityType: "booking",
      entityId: bookingId,
      metadata: { note: note.trim() },
    });

    revalidatePath(`/admin/bookings/${bookingId}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// confirmBooking (manual confirmation for edge cases)
// ─────────────────────────────────────────────────────────────────────────────

export const confirmBooking = withAdmin(async (admin, bookingId: string) => {
  if (!bookingId) throw new Error("bookingId is required");

  const supabase = getServiceClient();
  const beforeSnapshot = await getBookingSnapshot(bookingId);

  if (!beforeSnapshot) throw new Error("Booking not found");
  if (beforeSnapshot.status === "confirmed") return; // already confirmed — no-op

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) throw new Error(`Failed to confirm booking: ${error.message}`);

  await writeAuditLog({
    admin,
    action: AUDIT_ACTIONS.BOOKING_CONFIRMED,
    entityType: "booking",
    entityId: bookingId,
    beforeSnapshot: beforeSnapshot as Record<string, unknown>,
    afterSnapshot: { status: "confirmed", payment_status: "paid" },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
});
