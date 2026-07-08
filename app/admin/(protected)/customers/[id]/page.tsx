// app/admin/(protected)/customers/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { StatusBadge, DetailRow } from "@/app/admin/_components/AdminUI";
import { ArrowLeft } from "lucide-react";

async function fetchCustomerDetail(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [
    { data: customer },
    { data: bookings },
    { data: addresses },
    { data: notes },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, full_name, email, phone, auth_user_id, stripe_customer_id, created_at, updated_at, onboarding_completed_at, magic_link_sent_at",
      )
      .eq("id", id)
      .single(),

    supabase
      .from("bookings")
      .select(
        "id, booking_date, time_slot, status, payment_status, plan_label, service_type, frequency, final_price, final_price_cents, subscription_status, created_at",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("addresses")
      .select(
        "id, street_address, apartment_number, city, postal_code, square_meters, number_of_rooms",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("customer_notes")
      .select("id, note, created_at, admin_id")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    customer,
    bookings: bookings ?? [],
    addresses: addresses ?? [],
    notes: notes ?? [],
  };
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtEur(val: number | null | undefined): string {
  if (val == null) return "—";
  return `€${Number(val).toFixed(2)}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;
  const { customer, bookings, addresses, notes } =
    await fetchCustomerDetail(id);

  if (!customer) notFound();

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const activeSubscription = bookings.find(
    (b) => b.subscription_status === "active",
  );
  const totalSpend = confirmedBookings.reduce(
    (sum, b) => sum + Number(b.final_price ?? 0),
    0,
  );

  return (
    <div className="max-w-5xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-[#0a1628] transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to customers
        </Link>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          {customer.full_name ?? customer.email}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          {customer.auth_user_id ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f0f8f3] text-[#3d6b47]">
              Authenticated
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
              Guest
            </span>
          )}
          {activeSubscription && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700">
              Active subscriber
            </span>
          )}
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total bookings", value: bookings.length },
          { label: "Confirmed", value: confirmedBookings.length },
          { label: "Total spend", value: `€${totalSpend.toFixed(2)}` },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-200 px-5 py-4"
          >
            <p className="text-[22px] font-extrabold text-[#0a1628]">
              {s.value}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Profile details ──────────────────────────────────────────── */}
      <Section title="Profile">
        <DetailRow label="Full name" value={customer.full_name} />
        <DetailRow label="Email" value={customer.email} />
        <DetailRow label="Phone" value={customer.phone} />
        <DetailRow label="Joined" value={fmt(customer.created_at)} />
        <DetailRow
          label="Account created"
          value={fmt(customer.onboarding_completed_at)}
        />
        <DetailRow label="Customer ID" value={customer.id} mono />
        <DetailRow label="Stripe ID" value={customer.stripe_customer_id} mono />
        <DetailRow label="Auth user ID" value={customer.auth_user_id} mono />
      </Section>

      {/* ── Addresses ───────────────────────────────────────────────── */}
      {addresses.length > 0 && (
        <Section title="Service addresses">
          <div className="space-y-3">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="py-2.5 border-b border-gray-50 last:border-0"
              >
                <p className="text-[13px] font-medium text-[#0a1628]">
                  {a.street_address}
                  {a.apartment_number && `, ${a.apartment_number}`}
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {a.postal_code} {a.city}
                  {a.square_meters && ` · ${a.square_meters} m²`}
                  {a.number_of_rooms && ` · ${a.number_of_rooms} rooms`}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Booking history ──────────────────────────────────────────── */}
      <Section title={`Bookings (${bookings.length})`}>
        {bookings.length === 0 ? (
          <p className="text-[13px] text-gray-400 italic">No bookings yet.</p>
        ) : (
          <div className="space-y-0 -mx-5">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Ref", "Service", "Date", "Status", "Amount", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-2.5 font-mono text-[11px] text-gray-400">
                        #{b.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-[#0a1628]">
                          {b.plan_label ?? b.service_type}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {b.frequency}
                        </p>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmt(b.booking_date)}
                      </td>
                      <td className="px-5 py-2.5">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-5 py-2.5 font-semibold text-[#0a1628]">
                        {fmtEur(b.final_price)}
                      </td>
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="text-[#7c9885] font-semibold text-[12px] hover:text-[#3d6b47] transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* ── Admin notes ─────────────────────────────────────────────── */}
      <Section title="Internal notes">
        {notes.length === 0 ? (
          <p className="text-[13px] text-gray-400 italic">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="bg-amber-50 rounded-xl px-4 py-3">
                <p className="text-[13px] text-[#0a1628]">{n.note}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {fmt(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          {title}
        </p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
