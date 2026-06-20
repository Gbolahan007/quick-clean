// lib/fetchSlots.ts
import { createClient } from "@supabase/supabase-js";
import { formatTime, getDayOfWeek } from "./slotUtils";
import { SlotOption } from "@/app/types/slot";

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function fetchSlotsForDate(
  isoDate: string,
): Promise<SlotOption[]> {
  const supabase = getAnonClient();
  const dayOfWeek = getDayOfWeek(isoDate);

  console.log(
    "[fetchSlotsForDate] date:",
    isoDate,
    "→ day_of_week:",
    dayOfWeek,
  );

  // ── 1. Fetch slots for this day_of_week ───────────────────────────────────
  const { data: slotRows, error: slotError } = await supabase
    .from("availability_slots")
    .select("id, start_time, end_time, max_bookings, is_available")
    .eq("day_of_week", dayOfWeek)
    .eq("is_available", true)
    .order("start_time", { ascending: true });

  console.log(
    "[fetchSlotsForDate] slotRows:",
    slotRows,
    "error:",
    slotError?.message,
  );

  if (slotError) {
    throw new Error(`Failed to fetch slots: ${slotError.message}`);
  }

  if (!slotRows || slotRows.length === 0) return [];

  // ── 2. Count existing non-cancelled bookings for this date ────────────────
  // Only time_slot is selected — no sensitive customer data exposed to client
  const { data: existingBookings, error: bookingError } = await supabase
    .from("bookings")
    .select("time_slot")
    .eq("booking_date", isoDate)
    .neq("status", "cancelled");

  if (bookingError) {
    console.warn(
      "[fetchSlotsForDate] booking count error:",
      bookingError.message,
    );
  }

  // Build a count map: { "08:00": 2, "11:00": 1 }
  const bookingCounts: Record<string, number> = {};
  for (const b of existingBookings ?? []) {
    const key = formatTime(b.time_slot); // "08:00:00" → "08:00"
    bookingCounts[key] = (bookingCounts[key] ?? 0) + 1;
  }

  console.log("[fetchSlotsForDate] bookingCounts:", bookingCounts);

  // ── 3. Merge and return ───────────────────────────────────────────────────
  return slotRows.map((slot) => {
    const startTime = formatTime(slot.start_time);
    const endTime = formatTime(slot.end_time);
    const count = bookingCounts[startTime] ?? 0;
    const isFull = count >= slot.max_bookings;
    const isAvailable = !isFull; // is_available already filtered to true above

    return {
      id: slot.id,
      startTime,
      endTime,
      isAvailable,
      isFull,
      currentCount: count,
      maxBookings: slot.max_bookings,
    } satisfies SlotOption;
  });
}
