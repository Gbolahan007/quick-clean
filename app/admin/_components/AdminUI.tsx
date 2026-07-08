"use client";
// app/admin/_components/AdminUI.tsx
// Shared primitives: StatusBadge, SearchInput, Pagination, EmptyState

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-[#f0f8f3] text-[#3d6b47]",
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-600",
  active: "bg-[#f0f8f3] text-[#3d6b47]",
  past_due: "bg-red-50 text-red-600",
  canceled: "bg-gray-100 text-gray-500",
  paid: "bg-[#f0f8f3] text-[#3d6b47]",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-blue-50 text-blue-600",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Search input ──────────────────────────────────────────────────────────────

export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const [, startTransition] = useTransition();

  function handleChange(val: string) {
    setValue(val);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set(paramName, val);
      } else {
        params.delete(paramName);
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] text-[#0a1628] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] w-64 transition-colors"
      />
    </div>
  );
}

// ── Filter select ─────────────────────────────────────────────────────────────

export function FilterSelect({
  paramName,
  options,
  placeholder,
}: {
  paramName: string;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? "";

  function handleChange(val: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set(paramName, val);
    } else {
      params.delete(paramName);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <p className="text-[12px] text-gray-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[14px] text-gray-400">{message}</p>
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

export function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-[12px] text-gray-400 shrink-0 pt-px w-40">
        {label}
      </span>
      <span
        className={`text-[13px] font-medium text-[#0a1628] text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
