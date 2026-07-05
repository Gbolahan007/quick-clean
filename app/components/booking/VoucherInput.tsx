"use client";
// app/components/booking/VoucherInput.tsx

import { useState, useTransition } from "react";
import { ChevronDown, Tag, X } from "lucide-react";
import { previewVoucherAction } from "@/app/actions/previewVoucher";
import type { VoucherPreview } from "@/app/lib/vouchers/types";

interface Props {
  email: string;
  serviceType: string;
  originalAmountCents: number;
  appliedVoucher: VoucherPreview | null;
  onApply: (voucher: VoucherPreview | null) => void;
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function VoucherInput({
  email,
  serviceType,
  originalAmountCents,
  appliedVoucher,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await previewVoucherAction({
        code,
        email,
        serviceType,
        originalAmountCents,
      });
      if (!result.valid) {
        setError(result.error);
        return;
      }
      onApply(result);
      setOpen(false);
    });
  }

  function handleRemove() {
    onApply(null);
    setCode("");
    setError(null);
  }

  // ── Applied state ─────────────────────────────────────────────────────────
  if (appliedVoucher) {
    return (
      <div className="rounded-xl border border-[#d4e8d9] bg-[#f0f8f3] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 text-[#7c9885] shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#3d6b47] truncate">
                {appliedVoucher.code}
                {appliedVoucher.description && (
                  <span className="font-normal text-[#3d6b47]/70 ml-1.5">
                    — {appliedVoucher.description}
                  </span>
                )}
              </p>
              <p className="text-[12px] text-[#3d6b47]/70">
                {appliedVoucher.discountType === "percentage"
                  ? `${appliedVoucher.discountValue}% off`
                  : `${formatCents(appliedVoucher.discountValue)} off`}
                {" · "}
                You save {formatCents(appliedVoucher.discountAmountCents)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-[#7c9885] hover:text-[#3d6b47] transition-colors shrink-0"
            aria-label="Remove voucher"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Collapsed trigger ─────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-[13px] font-semibold text-[#7c9885] hover:text-[#3d6b47] transition-colors"
      >
        <Tag className="w-4 h-4" />
        Have a voucher code?
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    );
  }

  // ── Expanded input ────────────────────────────────────────────────────────
  // Stack vertically on mobile, row on sm+.
  // Input never causes horizontal overflow because it's constrained to
  // the parent width with min-w-0 and the buttons sit below on small screens.
  return (
    <div className="space-y-2">
      {/* Row: input + Apply — full width, no overflow */}
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          placeholder="VOUCHER CODE"
          autoFocus
          className={[
            "min-w-0 flex-1 px-3 py-2 rounded-xl border border-gray-200",
            "text-[13px] font-mono uppercase text-[#0a1628]",
            "placeholder:text-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885]",
            "transition-colors",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending || !code.trim()}
          className="shrink-0 px-4 py-2 rounded-xl bg-[#7c9885] text-[13px] font-semibold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Checking…" : "Apply"}
        </button>
      </div>

      {/* Cancel sits on its own line — never pushed off screen */}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>

      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
