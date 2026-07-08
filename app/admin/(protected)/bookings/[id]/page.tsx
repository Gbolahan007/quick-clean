import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import { StatusBadge, DetailRow } from "@/app/admin/_components/AdminUI";
import { ArrowLeft } from "lucide-react";
import { BookingActions } from "@/app/admin/_components/BookingActions";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchBookingDetail(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [{ data: booking }, { data: notes }, { data: payments }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          `
          id, booking_date, time_slot, status, payment_status,
          service_type, plan_label, plan_key, frequency,
          final_price, final_price_cents, base_price,
          original_final_price_cents, discount_amount_cents,
          discount_source, is_first_booking, stripe_coupon_id,
          apartment_size, apartment_key, apartment_label,
          addons_snapshot, special_notes,
          office_name, office_size_sqm, weekly_hours,
          hourly_rate, monthly_estimate,
          stripe_checkout_session_id, stripe_subscription_id,
          stripe_payment_intent_id, stripe_price_id,
          subscription_status, current_period_start,
          current_period_end, cancel_at_period_end, canceled_at,
          visits_per_month, evening_weekend_surcharge,
          created_at, updated_at,
          customers (
            id, full_name, email, phone,
            auth_user_id, stripe_customer_id, created_at
          ),
          addresses (
            street_address, apartment_number, city,
            postal_code, square_meters, number_of_rooms,
            access_instructions
          )
        `,
        )
        .eq("id", id)
        .single(),

      supabase
        .from("booking_notes")
        .select("id, note, created_at, admin_id")
        .eq("booking_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("payments")
        .select(
          "id, amount_cents, currency, status, paid_at, stripe_invoice_id, is_first_payment, failure_message",
        )
        .eq("booking_id", id)
        .order("paid_at", { ascending: false }),
    ]);

  return { booking, notes: notes ?? [], payments: payments ?? [] };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(
  d: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(
    "en-GB",
    opts ?? {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function fmtTime(t: string | null | undefined): string {
  return t?.slice(0, 5) ?? "—";
}

function fmtEur(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `€${(cents / 100).toFixed(2)}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BookingDetailPage({
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
  const { booking, notes, payments } = await fetchBookingDetail(id);

  if (!booking) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = booking.customers as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const address = booking.addresses as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addons = booking.addons_snapshot as any;

  const isOffice = booking.service_type === "office";
  const isSubscription = booking.frequency !== "one-time";
  const ref = booking.id.slice(0, 8).toUpperCase();

  return (
    <div className="max-w-5xl space-y-6">
      {/* ── Back + header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-[#0a1628] transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to bookings
          </Link>
          <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
            Booking #{ref}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.payment_status ?? "pending"} />
            {booking.subscription_status && (
              <StatusBadge status={booking.subscription_status} />
            )}
          </div>
        </div>
        {/* Stripe link */}
        {booking.stripe_checkout_session_id && (
          <a
            href={`https://dashboard.stripe.com/test/checkout/sessions/${booking.stripe_checkout_session_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            View in Stripe ↗
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Service details */}
          <Section title="Service">
            <DetailRow label="Plan" value={booking.plan_label} />
            <DetailRow label="Service type" value={booking.service_type} />
            <DetailRow label="Frequency" value={booking.frequency} />
            <DetailRow label="Date" value={fmt(booking.booking_date)} />
            <DetailRow label="Time slot" value={fmtTime(booking.time_slot)} />
            {booking.apartment_size && (
              <DetailRow label="Apartment" value={booking.apartment_size} />
            )}
            {isOffice && (
              <>
                <DetailRow label="Office name" value={booking.office_name} />
                <DetailRow
                  label="Office size"
                  value={
                    booking.office_size_sqm
                      ? `${booking.office_size_sqm} m²`
                      : null
                  }
                />
                <DetailRow
                  label="Weekly hours"
                  value={
                    booking.weekly_hours
                      ? `${booking.weekly_hours}h/week`
                      : null
                  }
                />
                <DetailRow
                  label="Hourly rate"
                  value={
                    booking.hourly_rate ? `€${booking.hourly_rate}/h` : null
                  }
                />
              </>
            )}
            {isSubscription && (
              <>
                <DetailRow
                  label="Visits/month"
                  value={
                    booking.visits_per_month
                      ? `${booking.visits_per_month}`
                      : null
                  }
                />
                <DetailRow
                  label="Period start"
                  value={fmt(booking.current_period_start)}
                />
                <DetailRow
                  label="Next billing"
                  value={fmt(booking.current_period_end)}
                />
                <DetailRow
                  label="Cancel at period"
                  value={booking.cancel_at_period_end ? "Yes" : "No"}
                />
              </>
            )}
            {booking.canceled_at && (
              <DetailRow
                label="Cancelled at"
                value={fmt(booking.canceled_at)}
              />
            )}
            {booking.special_notes && (
              <DetailRow label="Notes" value={booking.special_notes} />
            )}
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            {booking.original_final_price_cents && (
              <DetailRow
                label="Original price"
                value={fmtEur(booking.original_final_price_cents)}
              />
            )}
            {booking.discount_source && (
              <DetailRow
                label="Discount"
                value={`${booking.is_first_booking ? "First booking 25%" : "Voucher"} — ${fmtEur(booking.discount_amount_cents)}`}
              />
            )}
            <DetailRow
              label="Final price"
              value={fmtEur(
                booking.final_price_cents ??
                  Math.round(Number(booking.final_price) * 100),
              )}
            />
            {isOffice && booking.monthly_estimate && (
              <DetailRow
                label="Monthly estimate"
                value={`€${booking.monthly_estimate}`}
              />
            )}
            {addons?.count > 0 && (
              <DetailRow
                label="Add-ons"
                value={`${addons.names?.join(", ")} (+€${addons.discountedTotal})`}
              />
            )}
          </Section>

          {/* Customer */}
          <Section title="Customer">
            <DetailRow label="Name" value={customer?.full_name} />
            <DetailRow label="Email" value={customer?.email} />
            <DetailRow label="Phone" value={customer?.phone} />
            <DetailRow
              label="Account"
              value={customer?.auth_user_id ? "Authenticated" : "Guest"}
            />
            <DetailRow label="Customer ID" value={customer?.id} mono />
            {customer?.id && (
              <div className="pt-2">
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="text-[13px] font-semibold text-[#7c9885] hover:text-[#3d6b47] transition-colors"
                >
                  View customer profile →
                </Link>
              </div>
            )}
          </Section>

          {/* Address */}
          {address && (
            <Section title="Service address">
              <DetailRow
                label="Address"
                value={`${address.street_address}${address.apartment_number ? `, ${address.apartment_number}` : ""}`}
              />
              <DetailRow
                label="City"
                value={`${address.postal_code} ${address.city}`}
              />
              <DetailRow
                label="Size"
                value={
                  address.square_meters ? `${address.square_meters} m²` : null
                }
              />
              <DetailRow
                label="Rooms"
                value={
                  address.number_of_rooms ? `${address.number_of_rooms}` : null
                }
              />
              <DetailRow
                label="Access info"
                value={address.access_instructions}
              />
            </Section>
          )}

          {/* Stripe IDs */}
          <Section title="Stripe references">
            <DetailRow
              label="Checkout session"
              value={booking.stripe_checkout_session_id}
              mono
            />
            <DetailRow
              label="Payment intent"
              value={booking.stripe_payment_intent_id}
              mono
            />
            <DetailRow
              label="Subscription"
              value={booking.stripe_subscription_id}
              mono
            />
            <DetailRow label="Price ID" value={booking.stripe_price_id} mono />
            <DetailRow
              label="Coupon ID"
              value={booking.stripe_coupon_id}
              mono
            />
          </Section>

          {/* Payment history */}
          {payments.length > 0 && (
            <Section title="Payment history">
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-[#0a1628]">
                        {fmtEur(p.amount_cents)}
                        {p.is_first_payment && (
                          <span className="ml-1.5 text-[10px] text-[#7c9885] font-bold">
                            FIRST
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {p.paid_at ? fmt(p.paid_at) : "—"}
                        {p.stripe_invoice_id && (
                          <span className="ml-1.5 font-mono">
                            {p.stripe_invoice_id.slice(0, 12)}…
                          </span>
                        )}
                      </p>
                      {p.failure_message && (
                        <p className="text-[11px] text-red-500 mt-0.5">
                          {p.failure_message}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Admin notes */}
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

        {/* ── Right column: actions ─────────────────────────────────── */}
        <div>
          <BookingActions
            bookingId={booking.id}
            currentStatus={booking.status}
            hasStripeSubscription={!!booking.stripe_subscription_id}
            cancelAtPeriodEnd={booking.cancel_at_period_end ?? false}
          />
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

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
