import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAdminAuthClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { InviteAdminForm } from "../../_components/InviteAdminForm";
import { RemoveAdminButton } from "../../_components/RemoveAdminButton";

async function fetchAdmins() {
  // Need service role to read auth.users for emails
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error || !profiles) return [];

  // Fetch emails from auth.users using service role
  const authClient = createAdminAuthClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const emailMap: Record<string, string> = {};
  await Promise.all(
    profiles.map(async (p) => {
      const { data } = await authClient.auth.admin.getUserById(p.id);
      if (data.user?.email) emailMap[p.id] = data.user.email;
    }),
  );

  return profiles.map((p) => ({
    ...p,
    email: emailMap[p.id] ?? "—",
  }));
}

function fmt(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function StaffPage() {
  const currentAdmin = await requireAdmin().catch(() => null);
  if (!currentAdmin) redirect("/admin/login");

  const admins = await fetchAdmins();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Staff
        </h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {admins.length} admin account{admins.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Invite new admin ─────────────────────────────────────────── */}
      <InviteAdminForm />

      {/* ── Admin list ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Admin accounts
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {admins.map((admin) => {
            const isSelf = admin.id === currentAdmin.id;

            return (
              <div
                key={admin.id}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-[#0a1628]">
                      {admin.full_name ?? "Unnamed admin"}
                    </p>
                    {isSelf && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f8f3] text-[#3d6b47]">
                        You
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">
                      {admin.role}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {admin.email}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    Added {fmt(admin.created_at)}
                    {admin.phone && ` · ${admin.phone}`}
                  </p>
                </div>

                {!isSelf && (
                  <RemoveAdminButton
                    adminId={admin.id}
                    adminName={admin.full_name ?? admin.email}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
