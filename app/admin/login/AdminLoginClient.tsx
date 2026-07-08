"use client";
// app/admin/login/AdminLoginClient.tsx

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        // Generic message — never reveal whether email or password is wrong
        setError("Invalid email or password.");
        return;
      }

      router.replace(nextPath);
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
            Admin Dashboard
          </h1>
          <p className="text-[13px] text-white/40">Sign in to continue</p>
        </div>

        {/* ── Form ──────────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
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
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="admin@frosh.fi"
              autoComplete="email"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c9885] focus:bg-white/15 transition-colors"
            />
          </div>

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
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c9885] focus:bg-white/15 transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-[#7c9885] text-[14px] font-bold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="text-center text-[11px] text-white/20">
          Frosh Admin — restricted access
        </p>
      </div>
    </main>
  );
}
