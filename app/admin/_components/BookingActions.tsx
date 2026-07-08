"use client";
// app/admin/_components/BookingActions.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Client component for booking detail action panel.
// Renders cancel, reschedule, confirm, and note forms.
// Calls server actions — all auth + audit logging happens server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import {
  cancelBooking,
  rescheduleBooking,
  addBookingNote,
  confirmBooking,
} from "@/app/admin/actions/bookingActions";

interface Props {
  bookingId: string;
  currentStatus: string;
  hasStripeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
}

type ActivePanel = "cancel" | "reschedule" | "note" | null;

export function BookingActions({
  bookingId,
  currentStatus,
  hasStripeSubscription,
}: Props) {
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCancelled = currentStatus === "cancelled";
  const isConfirmed = currentStatus === "confirmed";

  function reset() {
    setMessage(null);
    setError(null);
  }

  function showResult(result: { success: boolean; error?: string }) {
    if (result.success) {
      setMessage("Done.");
      setPanel(null);
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  }

  // ── Cancel form ───────────────────────────────────────────────────────────

  function CancelForm() {
    const [reason, setReason] = useState("");
    const [immediateCancel, setImmediateCancel] = useState(false);

    function submit() {
      if (!reason.trim()) {
        setError("Reason is required.");
        return;
      }
      startTransition(async () => {
        const result = await cancelBooking(bookingId, reason, immediateCancel);
        showResult(result);
      });
    }

    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] resize-none focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>
        {hasStripeSubscription && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={immediateCancel}
              onChange={(e) => setImmediateCancel(e.target.checked)}
              className="rounded"
            />
            <span className="text-[12px] text-gray-600">
              Cancel Stripe subscription immediately (not at period end)
            </span>
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl bg-red-500 text-[13px] font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Cancelling…" : "Confirm cancel"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(null);
              reset();
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Reschedule form ───────────────────────────────────────────────────────

  function RescheduleForm() {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [reason, setReason] = useState("");

    function submit() {
      if (!date || !time || !reason.trim()) {
        setError("Date, time, and reason are all required.");
        return;
      }
      startTransition(async () => {
        const result = await rescheduleBooking(bookingId, date, time, reason);
        showResult(result);
      });
    }

    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            New date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            New time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer request"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl bg-[#7c9885] text-[13px] font-bold text-white hover:bg-[#6f8c78] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Reschedule"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(null);
              reset();
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Note form ─────────────────────────────────────────────────────────────

  function NoteForm() {
    const [note, setNote] = useState("");

    function submit() {
      if (!note.trim()) {
        setError("Note cannot be empty.");
        return;
      }
      startTransition(async () => {
        const result = await addBookingNote(bookingId, note);
        showResult(result);
      });
    }

    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note — not visible to customer"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] resize-none focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl bg-[#0a1628] text-[13px] font-bold text-white hover:bg-[#1a2a40] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Add note"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(null);
              reset();
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Actions
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Feedback messages */}
        {message && (
          <div className="rounded-xl bg-[#f0f8f3] border border-[#d4e8d9] px-4 py-3">
            <p className="text-[13px] text-[#3d6b47] font-medium">{message}</p>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        )}

        {/* Active panel */}
        {panel === "cancel" && <CancelForm />}
        {panel === "reschedule" && <RescheduleForm />}
        {panel === "note" && <NoteForm />}

        {/* Action buttons (shown when no panel is open) */}
        {!panel && (
          <div className="space-y-2">
            {!isConfirmed && !isCancelled && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  startTransition(async () => {
                    const result = await confirmBooking(bookingId);
                    showResult(result);
                  });
                }}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl bg-[#7c9885] text-[13px] font-bold text-white hover:bg-[#6f8c78] disabled:opacity-50 transition-colors"
              >
                Confirm booking
              </button>
            )}

            {!isCancelled && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setPanel("reschedule");
                }}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#0a1628] hover:bg-gray-50 transition-colors"
              >
                Reschedule
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                reset();
                setPanel("note");
              }}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#0a1628] hover:bg-gray-50 transition-colors"
            >
              Add note
            </button>

            {!isCancelled && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setPanel("cancel");
                }}
                className="w-full py-2.5 rounded-xl border border-red-200 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancel booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
