"use server";
// app/admin/actions/settingsActions.ts

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { withAdmin } from "@/app/lib/supabase/admin";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── updatePlatformSettings ────────────────────────────────────────────────────

export const updatePlatformSettings = withAdmin(
  async (_admin, updates: { key: string; value: string }[]) => {
    if (!updates.length) throw new Error("No updates provided");

    const supabase = getServiceClient();

    const { error } = await supabase.from("platform_settings").upsert(
      updates.map((u) => ({
        key: u.key,
        value: u.value,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "key" },
    );

    if (error) throw new Error(`Failed to save settings: ${error.message}`);

    revalidatePath("/admin/settings");
  },
);

// ── toggleAvailabilitySlot ────────────────────────────────────────────────────

export const toggleAvailabilitySlot = withAdmin(
  async (_admin, slotId: string, isAvailable: boolean) => {
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("availability_slots")
      .update({ is_available: isAvailable })
      .eq("id", slotId);

    if (error) throw new Error(`Failed to update slot: ${error.message}`);

    revalidatePath("/admin/settings");
  },
);

// ── updateSlotMaxBookings ─────────────────────────────────────────────────────

export const updateSlotMaxBookings = withAdmin(
  async (_admin, slotId: string, maxBookings: number) => {
    if (maxBookings < 1) throw new Error("Max bookings must be at least 1");

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("availability_slots")
      .update({ max_bookings: maxBookings })
      .eq("id", slotId);

    if (error) throw new Error(`Failed to update slot: ${error.message}`);

    revalidatePath("/admin/settings");
  },
);
