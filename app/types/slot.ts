export interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  max_bookings: number;
  created_at: string;
}

// ── Enriched slot returned to the UI ─────────────────────────────────────────

export interface SlotOption {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isFull: boolean;
  currentCount: number;
  maxBookings: number;
}

// ── What gets persisted in Zustand ────────────────────────────────────────────

export interface SelectedSlot {
  slotId: string;
  startTime: string;
  endTime: string;
}
