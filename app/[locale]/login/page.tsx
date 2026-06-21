"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  sendMagicLink,
  loginWithPassword,
  verifyMagicLinkCode,
} from "@/app/actions/auth";
import { createClient } from "@/app/lib/supabase/client";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as "en" | "fi") ?? "en";

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const callbackError = searchParams.get("error");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => {
        if (user) router.replace(`/${locale}/dashboard`);
      });
  }, [locale, router]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      if (mode === "magic") {
        const result = await sendMagicLink(email, locale);
        if (result.success) {
          setSent(true);
        } else {
          setError(result.error);
        }
      } else {
        const result = await loginWithPassword(email, password);
        if (result.success) {
          router.push(`/${locale}/dashboard`);
        } else {
          setError(result.error);
        }
      }
    });
  }

  function handleVerifyCode() {
    setOtpError(null);
    startTransition(async () => {
      const result = await verifyMagicLinkCode(email, otp);
      if (result.success) {
        router.push(`/${locale}/dashboard`);
      } else {
        setOtpError(result.error);
      }
    });
  }

  if (sent) {
    return (
      <main className="min-h-screen  bg-[#f8faf9] flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center space-y-5  py-24">
          <div className="w-16 h-16 rounded-full bg-[#f0f8f3] flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-[#7c9885]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#0a1628] tracking-tight">
            Check your email
          </h1>
          <p className="text-[14px] text-[#0a1628]/55">
            We sent a login link to{" "}
            <strong className="text-[#0a1628]">{email}</strong>. Click the link
            to sign in — no password needed.
          </p>

          {/* ── Code entry fallback ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-left">
            <label
              htmlFor="otp"
              className="text-[12px] font-semibold text-[#0a1628]"
            >
              Or enter the 8-digit code from the email
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoComplete="one-time-code"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[16px] tracking-[0.3em] text-center text-[#0a1628] placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
            />
            {otpError && <p className="text-[13px] text-red-600">{otpError}</p>}
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={isPending || otp.length !== 8}
              className="w-full py-3 rounded-xl bg-[#7c9885] text-[14px] font-semibold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Verifying…" : "Verify code"}
            </button>
            <p className="text-[11px] text-gray-400 text-center">
              On mobile, the link can open in a different browser than expected.
              If that happens, use this code instead.
            </p>
          </div>

          <p className="text-[12px] text-gray-400">
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setOtp("");
                setOtpError(null);
              }}
              className="text-[#7c9885] font-medium hover:underline"
            >
              Send again
            </button>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center px-5">
      <div className="w-full max-w-md space-y-6  py-24">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <Link
            href={`/${locale}`}
            className="text-[13px] text-[#7c9885] font-semibold hover:underline"
          >
            ← Frosh
          </Link>
          <h1 className="text-[26px] font-extrabold text-[#0a1628] tracking-tight mt-3">
            Sign in to your account
          </h1>
          <p className="text-[14px] text-[#0a1628]/55">
            View your bookings, payments and subscriptions.
          </p>
        </div>

        {/* ── Auth error from callback ────────────────────────────────────── */}
        {callbackError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-[13px] text-red-700">
              {callbackError === "missing_code"
                ? "The login link was invalid or has expired. Please request a new one."
                : "Authentication failed. Please try again."}
            </p>
          </div>
        )}

        {/* ── Mode toggle ────────────────────────────────────────────────── */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
            }}
            className={[
              "flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors",
              mode === "magic"
                ? "bg-[#0a1628] text-white"
                : "text-gray-500 hover:text-[#0a1628]",
            ].join(" ")}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
            }}
            className={[
              "flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors",
              mode === "password"
                ? "bg-[#0a1628] text-white"
                : "text-gray-500 hover:text-[#0a1628]",
            ].join(" ")}
          >
            Password
          </button>
        </div>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[12px] font-semibold text-[#0a1628]"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[16px] text-[#0a1628] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
            />
          </div>

          {mode === "password" && (
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-[12px] font-semibold text-[#0a1628]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[16px] text-[#0a1628] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
              />
            </div>
          )}

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !email}
            className="w-full py-3 rounded-xl bg-[#7c9885] text-[14px] font-semibold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? "Sending…"
              : mode === "magic"
                ? "Send login link"
                : "Sign in"}
          </button>

          {mode === "magic" && (
            <p className="text-[12px] text-center text-gray-400">
              We&apos;ll email you a magic link — no password needed.
            </p>
          )}
        </div>

        <p className="text-center text-[12px] text-gray-400">
          Don&apos;t have a booking yet?{" "}
          <Link
            href={`/${locale}/pricing`}
            className="text-[#7c9885] font-medium hover:underline"
          >
            Book a clean
          </Link>
        </p>
      </div>
    </main>
  );
}
