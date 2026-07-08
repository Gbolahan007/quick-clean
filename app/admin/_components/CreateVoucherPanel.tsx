"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVoucher } from "@/app/admin/actions/voucherActions";
import type { CreateVoucherInput } from "@/app/admin/actions/voucherActions";
import { X } from "lucide-react";

const SERVICE_OPTIONS = [
  { label: "Maintenance", value: "maintenance" },
  { label: "Deep clean", value: "deep" },
  { label: "Move-out", value: "moveout" },
];

export function CreateVoucherPanel() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed_amount"
  >("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState("1");
  const [services, setServices] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleService(val: string) {
    setServices((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val],
    );
  }

  function handleSubmit() {
    setError(null);

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      setError("Enter a valid discount value.");
      return;
    }

    const input: CreateVoucherInput = {
      code,
      description,
      discountType,
      discountValue: value,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      maxUsesPerCustomer: parseInt(maxUsesPerCustomer, 10) || 1,
      applicableServices: services,
      expiresAt: expiresAt || null,
    };

    startTransition(async () => {
      const result = await createVoucher(input);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push(`/admin/vouchers/${result.data.id}`);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#d4e8d9] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f0f8f3]">
        <p className="text-[13px] font-bold text-[#0a1628]">
          Create new voucher
        </p>
        <button
          type="button"
          onClick={() => router.push("/admin/vouchers")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Code */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Voucher code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
            }
            placeholder="SUMMER25"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] font-mono uppercase text-[#0a1628] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
          <p className="text-[11px] text-gray-400">
            Letters, numbers, hyphens only. Used as Stripe coupon ID.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Summer promotion 25% off"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>

        {/* Discount type */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Discount type
          </label>
          <div className="flex gap-2">
            {(["percentage", "fixed_amount"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDiscountType(t)}
                className={[
                  "flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors",
                  discountType === t
                    ? "bg-[#0a1628] text-white border-[#0a1628]"
                    : "text-gray-500 border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                {t === "percentage" ? "Percentage" : "Fixed (€)"}
              </button>
            ))}
          </div>
        </div>

        {/* Discount value */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            {discountType === "percentage"
              ? "Percentage off"
              : "Amount off (€)"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">
              {discountType === "percentage" ? "%" : "€"}
            </span>
            <input
              type="number"
              min="0"
              max={discountType === "percentage" ? "100" : undefined}
              step={discountType === "percentage" ? "1" : "0.01"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "25" : "10.00"}
              className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
            />
          </div>
        </div>

        {/* Max uses */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Max total uses
          </label>
          <input
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Leave blank for unlimited"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>

        {/* Max uses per customer */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Max uses per customer
          </label>
          <input
            type="number"
            min="1"
            value={maxUsesPerCustomer}
            onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
        </div>

        {/* Expiry */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Expires at
          </label>
          <input
            type="date"
            value={expiresAt}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
          />
          <p className="text-[11px] text-gray-400">
            Leave blank — never expires
          </p>
        </div>

        {/* Applicable services */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0a1628]">
            Applicable services
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleService(s.value)}
                className={[
                  "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                  services.includes(s.value)
                    ? "bg-[#7c9885] text-white border-[#7c9885]"
                    : "text-gray-500 border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            {services.length === 0
              ? "All residential services (office always excluded)"
              : `${services.length} selected`}
          </p>
        </div>
      </div>

      {/* ── Error + submit ───────────────────────────────────────────── */}
      <div className="px-5 pb-5 space-y-3">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !code || !description || !discountValue}
            className="px-6 py-2.5 rounded-xl bg-[#0a1628] text-[13px] font-bold text-white hover:bg-[#1a2a40] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creating…" : "Create voucher + Stripe coupon"}
          </button>
          <p className="text-[11px] text-gray-400">
            A Stripe coupon will be created automatically with{" "}
            <code className="font-mono">duration=once</code>
          </p>
        </div>
      </div>
    </div>
  );
}
