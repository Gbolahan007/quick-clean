import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const ALLOWED_PATHS = [
    "/dashboard",
    "/dashboard/bookings",
    "/dashboard/payments",
    "/dashboard/subscriptions",
    "/dashboard/profile",
  ];
  const isSafePath = (p: string) => ALLOWED_PATHS.some((a) => p.startsWith(a));
  const redirectPath = next && isSafePath(next) ? next : "/dashboard";

  if (!code) {
    console.error("[auth/callback] No code parameter");
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=missing_code`, request.url),
    );
  }

  // ── Build response first, then create Supabase client that writes cookies TO it ──
  // This is the correct pattern for Route Handlers. Using cookies() from next/headers
  // in a Route Handler is read-only — you cannot set session cookies that way.
  // Instead, create the Supabase client with get/set/remove wired to the Response.
  const response = NextResponse.redirect(
    new URL(`/${locale}${redirectPath}`, request.url),
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the redirect response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange failed:", error.message);
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=auth_failed`, request.url),
    );
  }

  // Session cookie is now set on the response — browser will receive it on redirect.
  return response;
}
