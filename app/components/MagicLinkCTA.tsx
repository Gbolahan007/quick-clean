"use client";
// app/components/MagicLinkCTA.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown on booking success pages to invite customers to create an account.
// Pre-fills the email from the booking if provided.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { sendMagicLink } from "@/app/actions/auth";

interface Props {
  bookingEmail?: string;
  locale: string;
}

export function MagicLinkCTA({ bookingEmail, locale }: Props) {
  const [email, setEmail] = useState(bookingEmail ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink(email, locale);
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[#d4e8d9] bg-[#f0f8f3] px-5 py-4 text-center space-y-1">
        <p className="text-[13px] font-semibold text-[#3d6b47]">
          Login link sent!
        </p>
        <p className="text-[12px] text-[#3d6b47]/70">
          Check your email at <strong>{email}</strong> to access your account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 space-y-4">
      <div className="space-y-1">
        <p className="text-[13px] font-bold text-[#0a1628]">
          Save your booking details
        </p>
        <p className="text-[12px] text-[#0a1628]/55">
          Create a free account to track your bookings, payments and
          subscription — no password needed.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !email}
          className="px-4 py-2 rounded-xl bg-[#7c9885] text-[13px] font-semibold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isPending ? "Sending…" : "Send link"}
        </button>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
