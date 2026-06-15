"use server";
// app/actions/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server Actions for authentication.
// All auth mutations go through here — never called directly from the client.
//
// SECURITY MODEL:
//   sendMagicLink  — rate-limited per email (60 seconds between sends)
//   loginWithPassword — standard credential check, never exposes reason for failure
//   setPassword    — requires active session, updates auth.users only
//   logout         — signs out and redirects
//
// NEVER store passwords. NEVER implement custom token logic.
// Supabase Auth handles all cryptography.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import {
  createServerClient,
  createServiceClient,
} from "@/app/lib/supabase/server";

// ── Rate limit constant ───────────────────────────────────────────────────────
const MAGIC_LINK_COOLDOWN_SECONDS = 1000;

// ── Result types ─────────────────────────────────────────────────────────────

export type AuthResult = { success: true } | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// sendMagicLink
// Called from: booking success page CTA, login page
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMagicLink(
  email: string,
  locale: string,
): Promise<AuthResult> {
  const normalised = email.toLowerCase().trim();

  if (!normalised || !normalised.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createServerClient();
  const serviceSupabase = createServiceClient();

  // ── Rate limit check ──────────────────────────────────────────────────────
  const { data: customer } = await serviceSupabase
    .from("customers")
    .select("id, magic_link_sent_at")
    .eq("email", normalised)
    .maybeSingle();

  if (customer?.magic_link_sent_at) {
    const lastSent = new Date(customer.magic_link_sent_at).getTime();
    const nowMs = Date.now();
    const elapsedMs = nowMs - lastSent;

    if (elapsedMs < MAGIC_LINK_COOLDOWN_SECONDS * 1000) {
      const secondsLeft = Math.ceil(
        (MAGIC_LINK_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000,
      );
      return {
        success: false,
        error: `Please wait ${secondsLeft} seconds before requesting another link.`,
      };
    }
  }

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${baseUrl}/${locale}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email: normalised,
    options: {
      emailRedirectTo: redirectTo,

      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[auth] signInWithOtp error:", error.message);
    // Return a generic message — never expose Supabase internals to the client
    return {
      success: false,
      error: "Failed to send login link. Please try again.",
    };
  }

  // ── Update rate limit timestamp ───────────────────────────────────────────
  if (customer) {
    await serviceSupabase
      .from("customers")
      .update({ magic_link_sent_at: new Date().toISOString() })
      .eq("id", customer.id);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// loginWithPassword
// Called from: login page (secondary option)
// ─────────────────────────────────────────────────────────────────────────────

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalised = email.toLowerCase().trim();

  if (!normalised || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalised,
    password,
  });

  if (error) {
    // Generic error — never reveal whether email exists or password is wrong.
    // This prevents user enumeration attacks.
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// setPassword
// Called from: dashboard profile page
// Requires: active authenticated session
// ─────────────────────────────────────────────────────────────────────────────

export async function setPassword(password: string): Promise<AuthResult> {
  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to set a password.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[auth] setPassword error:", error.message);
    return {
      success: false,
      error: "Failed to update password. Please try again.",
    };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// logout
// Called from: dashboard header
// ─────────────────────────────────────────────────────────────────────────────

export async function logout(locale: "en" | "fi" = "en"): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
