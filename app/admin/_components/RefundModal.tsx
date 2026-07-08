"use client";
// app/admin/_components/RefundModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Inline refund panel — expands in place on the payments table row.
// Supports full and partial refunds.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { issueRefund } from "@/app/admin/actions/financialActions";

interface Props {
  paymentId: string;
  amountCents: number;
  currency: string;
}

export function RefundModal({ paymentId, amountCents, currency }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const symbol = currency === "eur" ? "€" : currency.toUpperCase();
  const max = amountCents / 100;

  function handleSubmit() {
    setError(null);
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    let refundCents: number | undefined;
    if (type === "partial") {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        setError("Enter a valid amount.");
        return;
      }
      if (val > max) {
        setError(`Cannot exceed ${symbol}${max.toFixed(2)}.`);
        return;
      }
      refundCents = Math.round(val * 100);
    }

    startTransition(async () => {
      const result = await issueRefund(paymentId, reason, refundCents);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(true);
        setOpen(false);
      }
    });
  }

  if (success) {
    return (
      <span className="text-[11px] font-semibold text-[#3d6b47]">
        Refunded ✓
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
      >
        Refund
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-[16px] font-extrabold text-[#0a1628]">
            Issue refund
          </h2>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Payment total: {symbol}
            {max.toFixed(2)}
          </p>
        </div>

        {/* Refund type */}
        <div className="flex gap-2">
          {(["full", "partial"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={[
                "flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-colors",
                type === t
                  ? "bg-[#0a1628] text-white border-[#0a1628]"
                  : "text-gray-500 border-gray-200 hover:border-gray-300",
              ].join(" ")}
            >
              {t === "full" ? `Full (${symbol}${max.toFixed(2)})` : "Partial"}
            </button>
          ))}
        </div>

        {/* Partial amount */}
        {type === "partial" && (
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[#0a1628]">
              Amount ({symbol})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={max}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max ${symbol}${max.toFixed(2)}`}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
            />
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested refund"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>

        {error && <p className="text-[12px] text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Processing…" : "Confirm refund"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
