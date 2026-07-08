"use server";
// app/admin/actions/staffActions.ts

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { withAdmin } from "@/app/lib/supabase/admin";
import { writeAuditLog, AUDIT_ACTIONS } from "@/app/lib/admin/auditLog";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── inviteAdmin ───────────────────────────────────────────────────────────────
// Sends a Supabase invite email. When the invited user clicks the link and
// sets their password, a profiles row must be created manually (or via trigger).
// For now: create the profiles row after invite using the new user's ID.

export const inviteAdmin = withAdmin(
  async (admin, email: string, fullName: string) => {
    if (!email.trim()) throw new Error("Email is required");
    if (!fullName.trim()) throw new Error("Full name is required");

    const supabase = getServiceClient();

    // Check if email already has a profiles row
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const existing = existingUser?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim(),
    );

    if (existing) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", existing.id)
        .maybeSingle();

      if (existingProfile)
        throw new Error("This email already has an admin account");
    }

    // Send invite email via Supabase Auth
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email.toLowerCase().trim(), {
        data: { full_name: fullName.trim() },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/login`,
      });

    if (inviteError)
      throw new Error(`Failed to send invite: ${inviteError.message}`);

    const newUserId = inviteData.user.id;

    // Create profiles row immediately so middleware recognises them as admin
    const { error: profileError } = await supabase.from("profiles").insert({
      id: newUserId,
      full_name: fullName.trim(),
      role: "admin",
    });

    if (profileError) {
      console.error(
        "[staffActions] Failed to create profile:",
        profileError.message,
      );
      throw new Error(
        "Invite sent but failed to create admin profile. Create it manually in Supabase.",
      );
    }

    await writeAuditLog({
      admin,
      action: AUDIT_ACTIONS.ADMIN_CREATED,
      entityType: "admin",
      entityId: newUserId,
      afterSnapshot: { email, fullName, role: "admin" },
    });

    revalidatePath("/admin/staff");
  },
);

// ── removeAdmin ───────────────────────────────────────────────────────────────
// Deletes the profiles row only — auth.users row is preserved for audit trail.
// The admin loses dashboard access immediately (middleware checks profiles).

export const removeAdmin = withAdmin(async (admin, targetAdminId: string) => {
  if (!targetAdminId) throw new Error("Admin ID is required");
  if (targetAdminId === admin.id) throw new Error("You cannot remove yourself");

  const supabase = getServiceClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", targetAdminId)
    .single();

  if (!target) throw new Error("Admin not found");

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", targetAdminId);

  if (error) throw new Error(`Failed to remove admin: ${error.message}`);

  await writeAuditLog({
    admin,
    action: AUDIT_ACTIONS.ADMIN_DEACTIVATED,
    entityType: "admin",
    entityId: targetAdminId,
    beforeSnapshot: { full_name: target.full_name, role: target.role },
    metadata: { note: "profiles row deleted — auth.users preserved" },
  });

  revalidatePath("/admin/staff");
});
