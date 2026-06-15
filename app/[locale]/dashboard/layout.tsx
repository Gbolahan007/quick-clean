// ─────────────────────────────────────────────────────────────────────────────
// Dashboard layout — server component.
// Auth guard: unauthenticated users are redirected to /login.
//
// HEADER STRATEGY:
//   The main site Header is rendered globally via the root layout and is
//   always visible. This layout does NOT render its own top navigation bar.
//   It only adds the dashboard tab strip (Bookings / Payments / etc.)
//   which sits sticky just below the fixed site header (top-20).
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/app/lib/supabase/server";
import { logout } from "@/app/actions/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  const supabase = await createServerClient();

  // ── Auth guard ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // ── Customer record for display name ─────────────────────────────────────
  const { data: customer } = await supabase
    .from("customers")
    .select("full_name, email")
    .eq("auth_user_id", user.id)
    .single();

  const displayName =
    customer?.full_name ?? customer?.email ?? user.email ?? "Account";

  const navLinks = [
    { href: `/${locale}/dashboard/bookings`, label: "Bookings" },
    { href: `/${locale}/dashboard/payments`, label: "Payments" },
    { href: `/${locale}/dashboard/subscriptions`, label: "Subscriptions" },
    { href: `/${locale}/dashboard/profile`, label: "Profile" },
  ];

  return (
    // pt-24 = 80px fixed site header + 16px breathing room
    <div className="min-h-screen bg-[#f8faf9] pt-24">
      {/* ── Dashboard tab strip ──────────────────────────────────────────── */}

      <div className="bg-white border-b border-gray-200  top-20 z-20">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between gap-4 py-2">
          {/* Tab links */}
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 px-3 py-2 rounded-lg text-[13px] font-semibold text-[#0a1628]/55 hover:text-[#0a1628] hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User display + sign out */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#0a1628]/40 hidden sm:block truncate max-w-35">
              {displayName}
            </span>
            <form
              action={async () => {
                "use server";
                await logout(locale as "en" | "fi");
              }}
            >
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#0a1628]/55 hover:text-[#0a1628] hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
