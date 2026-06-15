// app/[locale]/auth/callback/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supabase Auth PKCE callback handler.
//
// Supabase magic links use PKCE flow. The email link redirects here with a
// ?code= parameter. This route exchanges the code for a session cookie.
//
// SECURITY:
//   - Code exchange happens server-side (not client-side)
//   - Code is single-use (Supabase enforces this)
//   - No sensitive data in the redirect URL after exchange
//   - next= parameter is validated against allowed paths before redirect
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase/server";

// Allowed redirect paths after authentication.
// Prevents open redirect attacks via the ?next= parameter.
const ALLOWED_PATHS = [
  "/dashboard",
  "/dashboard/bookings",
  "/dashboard/payments",
  "/dashboard/subscriptions",
  "/dashboard/profile",
];

function isSafePath(path: string): boolean {
  return ALLOWED_PATHS.some((allowed) => path.startsWith(allowed));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams } = request.nextUrl;

  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Validate next path before using it
  const redirectPath = next && isSafePath(next) ? next : "/dashboard";

  const redirectUrl = `/${locale}${redirectPath}`;

  if (!code) {
    // No code parameter — redirect to login with error
    console.error("[auth/callback] No code parameter in callback URL");
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=missing_code`, request.url),
    );
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange failed:", error.message);
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=auth_failed`, request.url),
    );
  }

  // Code exchanged successfully — session cookie is now set.
  // The on_auth_user_created trigger has already fired (if new user)
  // and linked the customer record. Redirect to dashboard.
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
