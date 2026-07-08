// app/admin/(protected)/settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/lib/supabase/admin";
import {
  AvailabilityEditor,
  PlatformSettingsForm,
} from "../../_components/SettingsComponents";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

async function fetchSettings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [{ data: settings }, { data: slots }] = await Promise.all([
    supabase.from("platform_settings").select("key, value"),

    supabase
      .from("availability_slots")
      .select(
        "id, day_of_week, start_time, end_time, is_available, max_bookings",
      )
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const settingsMap: Record<string, string> = {};
  (settings ?? []).forEach((s) => {
    settingsMap[s.key] = s.value ?? "";
  });

  return { settings: settingsMap, slots: slots ?? [] };
}

export default async function SettingsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const { settings, slots } = await fetchSettings();

  // Group slots by day
  const slotsByDay: Record<number, typeof slots> = {};
  slots.forEach((s) => {
    if (!slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week] = [];
    slotsByDay[s.day_of_week].push(s);
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-[22px] font-extrabold text-[#0a1628] tracking-tight">
        Settings
      </h1>

      {/* ── Platform info ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold text-[#0a1628] uppercase tracking-wider">
          Platform information
        </h2>
        <PlatformSettingsForm
          group="platform"
          fields={[
            {
              key: "business_name",
              label: "Business name",
              placeholder: "Frosh",
              value: settings.business_name ?? "",
            },
            {
              key: "contact_email",
              label: "Contact email",
              placeholder: "hello@frosh.fi",
              value: settings.contact_email ?? "",
            },
          ]}
        />
      </section>

      {/* ── Email configuration ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold text-[#0a1628] uppercase tracking-wider">
          Email configuration
        </h2>
        <p className="text-[12px] text-gray-400">
          These values override environment variables at runtime for email
          sending. Changes take effect on the next booking confirmation.
        </p>
        <PlatformSettingsForm
          group="email"
          fields={[
            {
              key: "email_from",
              label: "From address",
              placeholder: "Frosh <hello@frosh.fi>",
              value: settings.email_from ?? "",
            },
            {
              key: "email_admin",
              label: "Admin email",
              placeholder: "admin@frosh.fi",
              value: settings.email_admin ?? "",
            },
          ]}
        />
      </section>

      {/* ── Availability slots ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold text-[#0a1628] uppercase tracking-wider">
          Availability slots
        </h2>
        <p className="text-[12px] text-gray-400">
          Toggle which time slots are available for booking. Changes take effect
          immediately.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {DAYS.map((dayName, dayIndex) => {
            const daySlots = slotsByDay[dayIndex] ?? [];
            if (daySlots.length === 0) return null;

            return (
              <div
                key={dayIndex}
                className="px-5 py-4 border-b border-gray-100 last:border-0"
              >
                <p className="text-[12px] font-bold text-[#0a1628] mb-3">
                  {dayName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <AvailabilityEditor
                      key={slot.id}
                      slotId={slot.id}
                      startTime={slot.start_time}
                      endTime={slot.end_time}
                      isAvailable={slot.is_available}
                      maxBookings={slot.max_bookings}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {slots.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-gray-400">
                No availability slots configured. Add them in the Supabase
                database.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
