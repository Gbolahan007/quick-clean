// app/admin/(protected)/audit/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import {
  FilterSelect,
  Pagination,
  EmptyState,
} from "@/app/admin/_components/AdminUI";

const PAGE_SIZE = 40;

const ACTION_OPTIONS = [
  { label: "Booking cancelled", value: "booking.cancelled" },
  { label: "Booking confirmed", value: "booking.confirmed" },
  { label: "Booking rescheduled", value: "booking.rescheduled" },
  { label: "Booking note added", value: "booking.note_added" },
  { label: "Customer edited", value: "customer.edited" },
  { label: "Customer note added", value: "customer.note_added" },
  { label: "Payment refunded", value: "payment.refunded" },
  { label: "Subscription cancelled", value: "subscription.cancelled" },
  { label: "Subscription reactivated", value: "subscription.reactivated" },
  { label: "Voucher created", value: "voucher.created" },
  { label: "Voucher deactivated", value: "voucher.deactivated" },
  { label: "Admin login", value: "admin.login" },
];

const ENTITY_OPTIONS = [
  { label: "Booking", value: "booking" },
  { label: "Customer", value: "customer" },
  { label: "Payment", value: "payment" },
  { label: "Subscription", value: "subscription" },
  { label: "Voucher", value: "voucher" },
  { label: "Admin", value: "admin" },
];

interface SearchParams {
  action?: string;
  entity?: string;
  page?: string;
}

async function fetchAuditLog(params: SearchParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Fetch audit log + join profiles for admin name
  let query = supabase
    .from("admin_audit_logs")
    .select(
      `
      id, action, entity_type, entity_id,
      metadata, created_at, admin_id,
      profiles ( full_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.action) query = query.eq("action", params.action);
  if (params.entity) query = query.eq("entity_type", params.entity);

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/audit] Fetch error:", error.message);
    return { events: [], total: 0, page, totalPages: 0 };
  }

  return {
    events: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionColor(action: string): string {
  if (action.includes("cancel")) return "bg-red-50 text-red-700";
  if (action.includes("refund")) return "bg-blue-50 text-blue-700";
  if (action.includes("create")) return "bg-[#f0f8f3] text-[#3d6b47]";
  if (action.includes("reactivate")) return "bg-purple-50 text-purple-700";
  if (action.includes("login")) return "bg-gray-100 text-gray-500";
  return "bg-amber-50 text-amber-700";
}

export default async function AuditLogPage({
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
  const { events, total, page, totalPages } = await fetchAuditLog(params);

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
          Audit Log
        </h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {total.toLocaleString()} events — append-only record of all admin
          actions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          paramName="action"
          placeholder="All actions"
          options={ACTION_OPTIONS}
        />
        <FilterSelect
          paramName="entity"
          placeholder="All entities"
          options={ENTITY_OPTIONS}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {events.length === 0 ? (
          <EmptyState message="No audit events found." />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {events.map((e) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profile = e.profiles as any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const metadata = e.metadata as any;
                const adminName = profile?.full_name ?? "Admin";

                return (
                  <div
                    key={e.id}
                    className="px-5 py-3.5 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${actionColor(e.action)}`}
                      >
                        {e.action.split(".")[1] ?? e.action}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0a1628]">
                          {e.action}
                          {e.entity_id && (
                            <span className="ml-2 font-mono text-[11px] text-gray-400">
                              #{String(e.entity_id).slice(0, 8).toUpperCase()}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          <span className="font-medium text-gray-500">
                            {adminName}
                          </span>
                          {metadata?.reason && (
                            <span className="ml-2 text-gray-300">
                              · {metadata.reason}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-gray-400 whitespace-nowrap">
                        {fmt(e.created_at)}
                      </p>
                      <p className="text-[10px] text-gray-300 mt-0.5 uppercase tracking-wide">
                        {e.entity_type}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
