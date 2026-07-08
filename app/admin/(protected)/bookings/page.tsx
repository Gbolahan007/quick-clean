// app/admin/(protected)/bookings/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import {
  SearchInput,
  FilterSelect,
  StatusBadge,
  Pagination,
  EmptyState,
} from "@/app/admin/_components/AdminUI";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const SERVICE_OPTIONS = [
  { label: "Maintenance", value: "maintenance" },
  { label: "Deep Clean", value: "deep" },
  { label: "Move-Out", value: "moveout" },
  { label: "Office", value: "office" },
];

const FREQUENCY_OPTIONS = [
  { label: "One-time", value: "one-time" },
  { label: "Weekly", value: "weekly" },
  { label: "Bi-weekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchParams {
  q?: string;
  status?: string;
  service?: string;
  freq?: string;
  page?: string;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchBookings(params: SearchParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const search = params.q?.trim() ?? "";

  // Base query
  let query = supabase
    .from("bookings")
    .select(
      `
      id, booking_date, time_slot, status, payment_status,
      service_type, plan_label, frequency,
      final_price, final_price_cents,
      apartment_size, office_name,
      subscription_status, cancel_at_period_end,
      is_first_booking, discount_source,
      created_at,
      customers (
        id, full_name, email, phone
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.service) query = query.eq("service_type", params.service);
  if (params.freq) query = query.eq("frequency", params.freq);

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/bookings] Fetch error:", error.message);
    return { bookings: [], total: 0, page, totalPages: 0 };
  }

  // Client-side search filter (Supabase free tier doesn't support ilike on joined tables)
  // For production scale, add a search index or use Postgres full-text search
  let bookings = data ?? [];
  if (search) {
    const q = search.toLowerCase();
    bookings = bookings.filter((b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = b.customers as any;
      return (
        b.id.toLowerCase().includes(q) ||
        b.plan_label?.toLowerCase().includes(q) ||
        b.office_name?.toLowerCase().includes(q) ||
        c?.full_name?.toLowerCase().includes(q) ||
        c?.email?.toLowerCase().includes(q)
      );
    });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return { bookings, total, page, totalPages };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(t: string): string {
  return t?.slice(0, 5) ?? "—";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const { bookings, total, page, totalPages } = await fetchBookings(params);

  return (
    <div className="space-y-5 max-w-7xl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
            Bookings
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {total.toLocaleString()} total
          </p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search by name, email, ref…" />
        <FilterSelect
          paramName="status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          paramName="service"
          placeholder="All services"
          options={SERVICE_OPTIONS}
        />
        <FilterSelect
          paramName="freq"
          placeholder="All frequencies"
          options={FREQUENCY_OPTIONS}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {bookings.length === 0 ? (
          <EmptyState message="No bookings found." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      "Ref",
                      "Customer",
                      "Service",
                      "Date",
                      "Status",
                      "Payment",
                      "Amount",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const customer = b.customers as any;
                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                          #{b.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0a1628] truncate max-w-40">
                            {customer?.full_name ?? "—"}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate max-w-40">
                            {customer?.email ?? ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[#0a1628] truncate max-w-35">
                            {b.plan_label ?? b.office_name ?? b.service_type}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {b.frequency}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-[#0a1628]">
                            {formatDate(b.booking_date)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatTime(b.time_slot)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.payment_status ?? "pending"} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-[#0a1628]">
                          €{Number(b.final_price).toFixed(2)}
                          {b.discount_source && (
                            <span className="ml-1 text-[10px] text-[#7c9885] font-bold">
                              {b.is_first_booking ? "1ST" : "V"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className="text-[#7c9885] font-semibold text-[12px] hover:text-[#3d6b47] transition-colors whitespace-nowrap"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
