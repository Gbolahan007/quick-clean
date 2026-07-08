// app/admin/(protected)/customers/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import {
  SearchInput,
  Pagination,
  EmptyState,
} from "@/app/admin/_components/AdminUI";

const PAGE_SIZE = 30;

interface SearchParams {
  q?: string;
  page?: string;
}

async function fetchCustomers(params: SearchParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const search = params.q?.trim() ?? "";

  let query = supabase
    .from("customers")
    .select(
      "id, full_name, email, phone, auth_user_id, stripe_customer_id, created_at, onboarding_completed_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Server-side search on email (indexed) — name search handled client-side
  if (search && search.includes("@")) {
    query = query.ilike("email", `%${search}%`);
  } else if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/customers] Fetch error:", error.message);
    return { customers: [], total: 0, page, totalPages: 0 };
  }

  // Fetch booking counts per customer in a separate query
  const ids = (data ?? []).map((c) => c.id);
  const { data: bookingCounts } =
    ids.length > 0
      ? await supabase
          .from("bookings")
          .select("customer_id")
          .in("customer_id", ids)
          .eq("status", "confirmed")
      : { data: [] };

  const countMap: Record<string, number> = {};
  (bookingCounts ?? []).forEach((b) => {
    countMap[b.customer_id] = (countMap[b.customer_id] ?? 0) + 1;
  });

  const customers = (data ?? []).map((c) => ({
    ...c,
    confirmedBookings: countMap[c.id] ?? 0,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return { customers, total, page, totalPages };
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCustomersPage({
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
  const { customers, total, page, totalPages } = await fetchCustomers(params);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
            Customers
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {total.toLocaleString()} total
          </p>
        </div>
      </div>

      <SearchInput placeholder="Search by name or email…" />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState message="No customers found." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      "Name",
                      "Email",
                      "Phone",
                      "Bookings",
                      "Account",
                      "Joined",
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
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0a1628]">
                        {c.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-50 truncate">
                        {c.email}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[12px] font-bold text-gray-600">
                          {c.confirmedBookings}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.auth_user_id ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f0f8f3] text-[#3d6b47]">
                            Auth
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                            Guest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {fmt(c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="text-[#7c9885] font-semibold text-[12px] hover:text-[#3d6b47] transition-colors whitespace-nowrap"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
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
