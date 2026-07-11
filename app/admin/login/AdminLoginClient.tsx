"use client";
// app/admin/login/AdminLoginClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Two modes: "login" (default) and "forgot" (password reset request).
// Forgot password calls resetPasswordForEmail with explicit redirectTo
// so the recovery email always points to /admin/reset-password.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

type Mode = "login" | "forgot";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://frosh.fi";
const RESET_REDIRECT = `${SITE_URL}/admin/reset-password`;

export function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/admin/dashboard";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setMessage(null);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  function handleLogin() {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    reset();
    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (signInError) {
        setError("Invalid email or password.");
        return;
      }
      router.replace(nextPath);
    });
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  function handleForgot() {
    if (!email.trim()) {
      setError("Enter your admin email address.");
      return;
    }
    reset();
    startTransition(async () => {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: RESET_REDIRECT },
      );
      if (resetError) {
        setError("Failed to send reset email. Please try again.");
        return;
      }
      // Always show success — never reveal whether the email exists
      setMessage(`Reset link sent to ${email}. Check your inbox.`);
    });
  }

  return (
    <main className="min-h-screen bg-[#0a1628] flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-8">
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#7c9885]">
            Frosh
          </p>
          <h1 className="text-[24px] font-extrabold text-white tracking-tight">
            {mode === "login" ? "Admin Dashboard" : "Reset Password"}
          </h1>
          <p className="text-[13px] text-white/40">
            {mode === "login"
              ? "Sign in to continue"
              : "Enter your admin email"}
          </p>
        </div>

        {/* ── Form ──────────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          {/* Success message (forgot password sent) */}
          {message && (
            <div className="rounded-xl bg-[#7c9885]/20 border border-[#7c9885]/30 px-4 py-3">
              <p className="text-[13px] text-[#7c9885] font-medium">
                {message}
              </p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[12px] font-semibold text-white/60 uppercase tracking-wider"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  mode === "login" ? handleLogin() : handleForgot();
                }
              }}
              placeholder="admin@frosh.fi"
              autoComplete="email"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c9885] focus:bg-white/15 transition-colors"
            />
          </div>

          {/* Password (login mode only) */}
          {mode === "login" && (
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-[12px] font-semibold text-white/60 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c9885] focus:bg-white/15 transition-colors"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={mode === "login" ? handleLogin : handleForgot}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-[#7c9885] text-[14px] font-bold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {isPending
              ? mode === "login"
                ? "Signing in…"
                : "Sending link…"
              : mode === "login"
                ? "Sign in"
                : "Send reset link"}
          </button>

          {/* Mode toggle */}
          <div className="pt-1 text-center">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  reset();
                  setPassword("");
                }}
                className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
              >
                Forgot your password?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  reset();
                }}
                className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
              >
                ← Back to login
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-white/20">
          Frosh Admin — restricted access
        </p>
      </div>
    </main>
  );
}
