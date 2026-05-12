// lib/slotUtils.ts

/**
 * Convert an ISO date string ("2025-09-15") to a day_of_week integer.
 * PostgreSQL EXTRACT(DOW): 0 = Sunday, 1 = Monday … 6 = Saturday
 * JS Date.getDay() matches this convention exactly.
 */
export function getDayOfWeek(isoDate: string): number {
  // Parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

/**
 * Trim seconds from a DB time string.
 * "08:00:00" → "08:00"
 * "08:00"    → "08:00"  (already trimmed — safe to call twice)
 */
export function formatTime(dbTime: string): string {
  return dbTime.slice(0, 5);
}

/**
 * Returns ISO date string for today + daysAhead days (local time).
 */
export function isoDateOffset(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWeekend(isoDate: string): boolean {
  const dow = getDayOfWeek(isoDate);
  return dow === 0 || dow === 6;
}
