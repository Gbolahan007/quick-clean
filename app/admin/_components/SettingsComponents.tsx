"use client";

import { useState, useTransition } from "react";
import {
  updatePlatformSettings,
  toggleAvailabilitySlot,
  updateSlotMaxBookings,
} from "@/app/admin/actions/settingsActions";

// ── PlatformSettingsForm ──────────────────────────────────────────────────────

interface SettingsField {
  key: string;
  label: string;
  placeholder: string;
  value: string;
}

export function PlatformSettingsForm({
  group,
  fields,
}: {
  group: string;
  fields: SettingsField[];
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSuccess(false);
    const updates = fields.map((f) => ({
      key: f.key,
      value: values[f.key] ?? "",
    }));
    startTransition(async () => {
      const result = await updatePlatformSettings(updates);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-5 space-y-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[#0a1628]">
              {f.label}
            </label>
            <input
              type="text"
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="px-5 pb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 rounded-xl bg-[#0a1628] text-[13px] font-bold text-white hover:bg-[#1a2a40] disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {success && (
          <span className="text-[13px] text-[#3d6b47] font-medium">
            Saved ✓
          </span>
        )}
        {error && <span className="text-[13px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// ── AvailabilityEditor ────────────────────────────────────────────────────────

export function AvailabilityEditor({
  slotId,
  startTime,
  endTime,
  isAvailable,
  maxBookings,
}: {
  slotId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  maxBookings: number;
}) {
  const [available, setAvailable] = useState(isAvailable);
  const [max, setMax] = useState(maxBookings);
  const [, startTransition] = useTransition();

  const label = `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`;

  function handleToggle() {
    const next = !available;
    setAvailable(next);
    startTransition(async () => {
      await toggleAvailabilitySlot(slotId, next);
    });
  }

  function handleMaxChange(val: number) {
    if (val < 1) return;
    setMax(val);
    startTransition(async () => {
      await updateSlotMaxBookings(slotId, val);
    });
  }

  return (
    <div
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-colors",
        available
          ? "border-[#d4e8d9] bg-[#f0f8f3] text-[#3d6b47]"
          : "border-gray-200 bg-gray-50 text-gray-400",
      ].join(" ")}
    >
      <span>{label}</span>

      {/* Toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className={[
          "w-8 h-4 rounded-full transition-colors relative shrink-0",
          available ? "bg-[#7c9885]" : "bg-gray-300",
        ].join(" ")}
        title={available ? "Disable slot" : "Enable slot"}
      >
        <span
          className={[
            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
            available ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>

      {/* Max bookings (only when available) */}
      {available && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleMaxChange(max - 1)}
            disabled={max <= 1}
            className="w-5 h-5 rounded text-[#3d6b47] hover:bg-[#d4e8d9] disabled:opacity-40 transition-colors flex items-center justify-center text-[14px] leading-none"
          >
            −
          </button>
          <span className="text-[11px] w-4 text-center">{max}</span>
          <button
            type="button"
            onClick={() => handleMaxChange(max + 1)}
            className="w-5 h-5 rounded text-[#3d6b47] hover:bg-[#d4e8d9] transition-colors flex items-center justify-center text-[14px] leading-none"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
