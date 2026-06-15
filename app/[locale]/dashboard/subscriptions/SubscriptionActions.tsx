"use client";

// Client component for cancel/reactivate interactions.

import { useState, useTransition } from "react";
import {
  cancelSubscription,
  reactivateSubscription,
} from "@/app/actions/subscription";

interface Props {
  bookingId: string;
  cancelAtPeriodEnd: boolean;
}

export function SubscriptionActions({ bookingId, cancelAtPeriodEnd }: Props) {
  const [localCancelling, setLocalCancelling] = useState(cancelAtPeriodEnd);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelSubscription(bookingId);
      if (result.success) {
        setLocalCancelling(true);
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  function handleReactivate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await reactivateSubscription(bookingId);
      if (result.success) {
        setLocalCancelling(false);
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="pt-1 space-y-2">
      {message && (
        <p className="text-[12px] text-[#3d6b47] font-medium">{message}</p>
      )}
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      {localCancelling ? (
        <button
          type="button"
          onClick={handleReactivate}
          disabled={isPending}
          className="px-4 py-2 rounded-xl border border-[#7c9885] text-[13px] font-semibold text-[#7c9885] hover:bg-[#f0f8f3] disabled:opacity-50 transition-colors"
        >
          {isPending ? "Reactivating…" : "Reactivate subscription"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-500 hover:border-red-200 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Cancelling…" : "Cancel at period end"}
        </button>
      )}
    </div>
  );
}
