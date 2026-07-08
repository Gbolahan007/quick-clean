// app/admin/_components/AdminTopBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin top bar — server component (no interactivity needed).
// Shows current admin name, role, and sign-out button.
// ─────────────────────────────────────────────────────────────────────────────

import { logout } from "@/app/actions/auth";
import type { AdminProfile } from "@/app/lib/supabase/admin";

interface Props {
  admin: AdminProfile;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  operations: "Operations",
  finance: "Finance",
  support: "Support",
};

export function AdminTopBar({ admin }: Props) {
  const displayName = admin.full_name ?? "Admin";
  const roleLabel = ROLE_LABELS[admin.role] ?? admin.role;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* ── Page breadcrumb placeholder ───────────────────────────── */}
      <div />

      {/* ── Admin identity + sign out ─────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[#0a1628]">
            {displayName}
          </p>
          <p className="text-[11px] text-gray-400">{roleLabel}</p>
        </div>

        <form
          action={async () => {
            "use server";
            await logout("en");
          }}
        >
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-500 hover:text-[#0a1628] hover:bg-gray-100 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
