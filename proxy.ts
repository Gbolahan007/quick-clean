import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "./i18n";

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_ROOT_PATH = "/admin";
const ADMIN_PREFIX = "/admin";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

// ── Intl middleware instance ──────────────────────────────────────────────────

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

// ── Main proxy function ───────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    return handleAdminMiddleware(request);
  }

  return intlMiddleware(request);
}

// ── Admin auth guard ──────────────────────────────────────────────────────────

async function handleAdminMiddleware(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === ADMIN_LOGIN_PATH;
  const isResetPage = pathname === "/admin/reset-password";

  let response = NextResponse.next({ request });

  if (isLoginPage || isResetPage) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirectToAdminLogin(request, pathname);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    !profileError &&
    profile !== null &&
    ADMIN_ROLES.includes(profile.role as (typeof ADMIN_ROLES)[number]);

  if (!isAdmin) {
    return redirectToAdminLogin(request, pathname);
  }

  // Authenticated admin visiting /admin root — send to dashboard
  if (pathname === ADMIN_ROOT_PATH) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  response.headers.set("x-admin-role", profile.role);
  response.headers.set("x-admin-id", user.id);

  return response;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function redirectToAdminLogin(
  request: NextRequest,
  fromPath: string,
): NextResponse {
  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
  if (fromPath !== ADMIN_LOGIN_PATH && fromPath !== ADMIN_ROOT_PATH) {
    loginUrl.searchParams.set("next", fromPath);
  }
  return NextResponse.redirect(loginUrl);
}

// ── Matcher ───────────────────────────────────────────────────────────────────

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
