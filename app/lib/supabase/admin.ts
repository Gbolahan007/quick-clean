// app/lib/supabase/admin.ts
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from "@/app/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminRole = "admin" | "super_admin";

export interface AdminProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AdminRole;
  created_at: string;
}

const VALID_ROLES: AdminRole[] = ["admin", "super_admin"];

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── requireAdmin ──────────────────────────────────────────────────────────────
// Validates session and profiles row. Returns AdminProfile or throws.

export async function requireAdmin(): Promise<AdminProfile> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Unauthorized");
  }

  if (!VALID_ROLES.includes(profile.role as AdminRole)) {
    throw new Error("Unauthorized");
  }

  return profile as AdminProfile;
}

// ── withAdmin ─────────────────────────────────────────────────────────────────

export function withAdmin<TArgs extends unknown[], TReturn>(
  fn: (admin: AdminProfile, ...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<ActionResult<TReturn>> {
  return async (...args: TArgs): Promise<ActionResult<TReturn>> => {
    try {
      const admin = await requireAdmin();
      const data = await fn(admin, ...args);

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return {
          success: false,
          error: "Unauthorized",
        };
      }

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error",
      };
    }
  };
}
