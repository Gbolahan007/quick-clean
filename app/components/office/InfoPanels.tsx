"use client";

import { useTranslations } from "next-intl";

export function InfoPanels() {
  const t = useTranslations("pricing.office");
  const scopeItems = t.raw("scopeIncluded") as string[];
  const notesItems = t.raw("contractNotes") as string[];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Included scope */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#7c9885]">
          {t("scopeTitle")}
        </p>
        <ul className="space-y-1.5">
          {scopeItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-[#7c9885] shrink-0 mt-0.5" aria-hidden>
                ✓
              </span>
              <span className="text-[12px] text-[#0a1628]/70">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Contract notes */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-amber-600">
          {t("notesTitle")}
        </p>
        <ul className="space-y-1.5">
          {notesItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5" aria-hidden>
                ℹ
              </span>
              <span className="text-[12px] text-amber-800/80">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TrustBadges() {
  const t = useTranslations("pricing.office");
  const badges = t.raw("trust") as string[];

  return (
    <div className="rounded-xl bg-[#f0f8f3] border border-[#d4e8d9] p-4 space-y-2">
      {badges.map((item) => (
        <p key={item} className="text-[12px] text-[#3d6b47]">
          {item}
        </p>
      ))}
    </div>
  );
}
