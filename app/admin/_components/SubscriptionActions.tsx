"use client";
// app/admin/_components/SubscriptionActions.tsx
// Inline cancel/reactivate controls for the subscriptions table.

import { useState, useTransition } from "react";
import {
  adminCancelSubscription,
  adminReactivateSubscription,
} from "@/app/admin/actions/financialActions";

interface Props {
  bookingId: string;
  cancelAtPeriodEnd: boolean;
}

export function SubscriptionActions({
  bookingId,
  cancelAtPeriodEnd: initialCancelling,
}: Props) {
  const [cancelling, setCancelling] = useState(initialCancelling);
  const [showConfirm, setShowConfirm] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) return <span className="text-[11px] text-gray-400">Updated</span>;

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        {!cancelling && (
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <input
              type="checkbox"
              checked={immediate}
              onChange={(e) => setImmediate(e.target.checked)}
              className="rounded"
            />
            Cancel immediately
          </label>
        )}
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = cancelling
                  ? await adminReactivateSubscription(bookingId)
                  : await adminCancelSubscription(bookingId, immediate);
                if (!result.success) {
                  setError(result.error);
                } else {
                  setCancelling(!cancelling);
                  setShowConfirm(false);
                  setDone(true);
                }
              });
            }}
            className={[
              "px-2.5 py-1 rounded-lg text-[11px] font-bold text-white transition-colors disabled:opacity-50",
              cancelling ? "bg-[#7c9885]" : "bg-red-500 hover:bg-red-600",
            ].join(" ")}
          >
            {isPending ? "…" : cancelling ? "Reactivate" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className={[
        "text-[12px] font-semibold transition-colors whitespace-nowrap",
        cancelling
          ? "text-[#7c9885] hover:text-[#3d6b47]"
          : "text-red-500 hover:text-red-700",
      ].join(" ")}
    >
      {cancelling ? "Reactivate" : "Cancel"}
    </button>
  );
}
