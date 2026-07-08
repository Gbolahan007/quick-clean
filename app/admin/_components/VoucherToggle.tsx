"use client";

import { useState, useTransition } from "react";
import {
  deactivateVoucher,
  reactivateVoucher,
} from "@/app/admin/actions/voucherActions";

interface Props {
  voucherId: string;
  isActive: boolean;
  isExpired: boolean;
  isExhausted: boolean;
}

export function VoucherToggle({
  voucherId,
  isActive,
  isExpired,
  isExhausted,
}: Props) {
  const [active, setActive] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = active
        ? await deactivateVoucher(voucherId)
        : await reactivateVoucher(voucherId);

      if (!result.success) {
        setError(result.error);
      } else {
        setActive(!active);
        setMessage(active ? "Voucher deactivated." : "Voucher reactivated.");
      }
    });
  }

  const canToggle = !isExhausted;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-fit">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Actions
        </p>
      </div>
      <div className="px-5 py-5 space-y-4">
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

        {isExhausted ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-[13px] text-gray-500">
              This voucher has reached its maximum uses and cannot be
              reactivated. Create a new voucher if needed.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-[13px] font-semibold text-[#0a1628]">
                {active ? "Deactivate voucher" : "Reactivate voucher"}
              </p>
              <p className="text-[12px] text-gray-400">
                {active
                  ? "Prevents new redemptions. Does not affect existing bookings that used this voucher."
                  : isExpired
                    ? "This voucher is expired. Update the expiry date in the database before reactivating."
                    : "Re-enables this voucher for new redemptions."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending || !canToggle || (isExpired && !active)}
              className={[
                "w-full py-2.5 rounded-xl text-[13px] font-bold transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                active
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : "bg-[#7c9885] text-white hover:bg-[#6f8c78]",
              ].join(" ")}
            >
              {isPending ? "Updating…" : active ? "Deactivate" : "Reactivate"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
