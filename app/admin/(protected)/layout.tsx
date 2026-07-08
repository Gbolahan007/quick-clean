// app/admin/layout.tsx

import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/supabase/admin";

import { AdminSidebar } from "../_components/AdminSidebar";
import { AdminTopBar } from "../_components/AdminTopBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f0f2f0] flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar admin={admin} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
