"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  RefreshCw,
  Tag,
  BarChart3,
  Settings,
  ScrollText,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", icon: Calendar },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: RefreshCw },
  { label: "Vouchers", href: "/admin/vouchers", icon: Tag },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#0a1628]  flex flex-col shrink-0">
      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7c9885]">
          Frosh
        </p>
        <p className="text-[14px] font-extrabold text-white mt-0.5">Admin</p>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-[#7c9885]/20 text-[#7c9885]"
                  : "text-white/50 hover:text-white hover:bg-white/5",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
