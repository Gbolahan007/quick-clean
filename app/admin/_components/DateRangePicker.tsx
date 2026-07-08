"use client";
// app/admin/_components/DateRangePicker.tsx

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: 365 },
];

interface Props {
  from: string;
  to: string;
}

// ── Pure date helpers — no Date.now() during render ───────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function subtractDays(dateStr: string, n: number): string {
  return addDays(dateStr, -n);
}

// TODAY is computed once at module load — stable across renders
const TODAY = new Date().toISOString().slice(0, 10);

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [, startTransition] = useTransition();

  function apply(f: string, t: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", f);
    params.set("to", t);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  // applyPreset runs inside an event handler (onClick) — not during render.
  // Date arithmetic here is fine: event handlers are not subject to the
  // "components must be pure" rule. The error was Date.now() being called
  // at module scope or during render — this is safe.
  function applyPreset(days: number) {
    const toStr = TODAY;
    const fromStr = subtractDays(toStr, days);
    setLocalFrom(fromStr);
    setLocalTo(toStr);
    apply(fromStr, toStr);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets */}
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-500 border border-gray-200 hover:border-[#7c9885] hover:text-[#7c9885] transition-colors whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={localFrom}
          max={localTo}
          onChange={(e) => setLocalFrom(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
        />
        <span className="text-gray-400 text-[12px]">→</span>
        <input
          type="date"
          value={localTo}
          min={localFrom}
          max={TODAY}
          onChange={(e) => setLocalTo(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
        />
        <button
          type="button"
          onClick={() => apply(localFrom, localTo)}
          className="px-3 py-1.5 rounded-lg bg-[#0a1628] text-[12px] font-bold text-white hover:bg-[#1a2a40] transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
