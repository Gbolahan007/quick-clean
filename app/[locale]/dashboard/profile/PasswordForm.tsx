"use client";
// app/[locale]/dashboard/profile/PasswordForm.tsx

import { useState, useTransition } from "react";
import { setPassword } from "@/app/actions/auth";

export function PasswordForm() {
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setMessage(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const result = await setPassword(password);
      if (result.success) {
        setMessage("Password updated successfully.");
        setPasswordValue("");
        setConfirm("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="text-[12px] font-semibold text-[#0a1628]"
        >
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#0a1628] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="text-[12px] font-semibold text-[#0a1628]"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#0a1628] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
        />
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {message && (
        <p className="text-[13px] text-[#3d6b47] font-medium">{message}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !password || !confirm}
        className="px-5 py-2.5 rounded-xl bg-[#7c9885] text-[13px] font-semibold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Saving…" : "Set password"}
      </button>
    </div>
  );
}
