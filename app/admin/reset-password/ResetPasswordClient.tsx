"use client";
// app/admin/reset-password/ResetPasswordClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Supabase handles the token exchange automatically via the URL hash/query.
// By the time this component mounts, onAuthStateChange fires with
// event = "PASSWORD_RECOVERY" and a valid session is set.
// We just wait for that event, then show the password form.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";

type Stage = "loading" | "form" | "success" | "error";

export function ResetPasswordClient() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Wait for Supabase to fire PASSWORD_RECOVERY event ────────────────────
  // Supabase processes the token in the URL automatically.
  // onAuthStateChange fires "PASSWORD_RECOVERY" once the session is ready.
  // If no event fires within 5 seconds, the link is invalid or expired.

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = supabase.auth.onAuthStateChange((event: any) => {
      if (event === "PASSWORD_RECOVERY") {
        setStage("form");
      }
      if (event === "SIGNED_OUT") {
        setStage("error");
        setError("Session expired. Please request a new reset link.");
      }
    });

    // Fallback timeout — if PASSWORD_RECOVERY hasn't fired after 6s, link is bad
    const timeout = setTimeout(() => {
      setStage((prev) => {
        if (prev === "loading") {
          setError(
            "This reset link is invalid or has expired. Please request a new one.",
          );
          return "error";
        }
        return prev;
      });
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // ── Update password ───────────────────────────────────────────────────────

  function handleSubmit() {
    setError(null);

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("Failed to update password. Please try again.");
        return;
      }

      await supabase.auth.signOut();
      setStage("success");

      setTimeout(() => {
        router.replace("/admin/login");
      }, 2500);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a1628] flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#7c9885]">
            Frosh
          </p>
          <h1 className="text-[24px] font-extrabold text-white tracking-tight">
            Reset Password
          </h1>
        </div>

        {/* ── Loading ────────────────────────────────────────────────── */}
        {stage === "loading" && (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="w-5 h-5 border-2 border-[#7c9885] border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-white/60">Verifying reset link…</p>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {stage === "error" && (
          <div className="space-y-5">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-5 text-center">
              <p className="text-[14px] text-red-400 font-semibold">
                Link invalid or expired
              </p>
              <p className="text-[13px] text-red-400/70 mt-2 leading-relaxed">
                {error}
              </p>
            </div>
            <Link
              href="/admin/login"
              className="block w-full py-3 rounded-xl border border-white/10 text-[14px] font-semibold text-white/60 hover:text-white hover:border-white/20 text-center transition-colors"
            >
              ← Back to login
            </Link>
          </div>
        )}

        {/* ── Password form ──────────────────────────────────────────── */}
        {stage === "form" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-[13px] text-white/50 text-center">
              Choose a new password for your admin account
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-[12px] font-semibold text-white/60 uppercase tracking-wider"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c9885] focus:bg-white/15 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="text-[12px] font-semibold text-white/60 uppercase tracking-wider"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c9885] focus:bg-white/15 transition-colors"
              />
            </div>

            {password.length > 0 && password.length < 8 && (
              <p className="text-[11px] text-amber-400">
                {8 - password.length} more character
                {8 - password.length !== 1 ? "s" : ""} needed
              </p>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !password || !confirm}
              className="w-full py-3 rounded-xl bg-[#7c9885] text-[14px] font-bold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {isPending ? "Updating password…" : "Set new password"}
            </button>
          </div>
        )}

        {/* ── Success ────────────────────────────────────────────────── */}
        {stage === "success" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#7c9885]/20 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-[#7c9885]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-white">Password updated</p>
            <p className="text-[13px] text-white/50">
              Redirecting you to login…
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-white/20">
          Frosh Admin — restricted access
        </p>
      </div>
    </main>
  );
}
