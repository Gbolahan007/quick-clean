import { createServerClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { PasswordForm } from "./PasswordForm";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // RLS scopes to authenticated customer's own record
  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, created_at")
    .eq("auth_user_id", user.id)
    .single();

  const { data: addresses } = await supabase
    .from("addresses")
    .select(
      "id, street_address, apartment_number, city, postal_code, square_meters",
    )
    .order("created_at", { ascending: false });

  // Check if user has a password set (they do if they have a password provider)
  const hasPassword =
    user.app_metadata?.provider === "email" &&
    user.identities?.some(
      (i) => i.provider === "email" && i.identity_data?.hashed_password,
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Profile
        </h1>
        <p className="text-[14px] text-[#0a1628]/50 mt-1">
          Your personal details and account settings.
        </p>
      </div>

      {/* ── Personal information ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            Personal information
          </p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" value={customer?.full_name ?? "—"} />
          <Field label="Email" value={customer?.email ?? user.email ?? "—"} />
          <Field label="Phone" value={customer?.phone ?? "—"} />
          <Field
            label="Member since"
            value={
              customer?.created_at
                ? new Date(customer.created_at).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                  })
                : "—"
            }
          />
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[12px] text-gray-400">
            To update your personal details, contact us at{" "}
            <a
              href="mailto:hello@quickclean.fi"
              className="text-[#7c9885] font-medium hover:underline"
            >
              hello@quickclean.fi
            </a>
          </p>
        </div>
      </section>

      {/* ── Saved addresses ──────────────────────────────────────────────── */}
      {addresses && addresses.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
              Service addresses
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {addresses.map((addr) => (
              <div key={addr.id} className="px-5 py-3.5">
                <p className="text-[13px] font-semibold text-[#0a1628]">
                  {addr.street_address}
                  {addr.apartment_number && `, ${addr.apartment_number}`}
                </p>
                <p className="text-[12px] text-[#0a1628]/50 mt-0.5">
                  {addr.postal_code} {addr.city}
                  {addr.square_meters && ` · ${addr.square_meters} m²`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            Security
          </p>
        </div>
        <div className="px-5 py-5">
          <p className="text-[13px] text-[#0a1628]/70 mb-4">
            {hasPassword
              ? "You have a password set. You can change it below, or continue using magic link login."
              : "You currently sign in with magic links. Optionally set a password for faster future logins."}
          </p>
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="text-[13px] font-semibold text-[#0a1628] mt-0.5">{value}</p>
    </div>
  );
}
