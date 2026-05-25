"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { PillToggle } from "./PillToggle";

type PricingHeaderProps = {
  locale: "en" | "fi";
  serviceType: "maintenance" | "deep" | "moveout" | "office";
  showDeducted: boolean;
  onLocale: () => void;
  onServiceChange: (index: number) => void;
  onVatChange: (index: number) => void;
};

function TrustBar() {
  const t = useTranslations("pricing");
  const icons = ["✦", "◈", "⬡", "◇"];
  const keys = [
    "trustBadge1",
    "trustBadge2",
    "trustBadge3",
    "trustBadge4",
  ] as const;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {keys.map((key, i) => (
        <div
          key={key}
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-sm"
        >
          <span className="text-xs text-[#c5dbc9]">{icons[i]}</span>
          <span className="text-xs font-semibold text-white/90">{t(key)}</span>
        </div>
      ))}
    </div>
  );
}

export function PricingHeader({
  serviceType,
  showDeducted,
  onServiceChange,
  onVatChange,
}: PricingHeaderProps) {
  const t = useTranslations("pricing");
  const pathname = usePathname();

  const isOfficePage = pathname.endsWith("/pricing/office-cleaning");
  const isMoveOutPage = pathname.endsWith("/pricing/move-out-cleaning");

  return (
    <div className="relative overflow-hidden pb-12">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pricing.jpg"
          alt="Clean modern home"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-225 px-5 pt-24 text-center">
        <h1 className="mb-2 text-4xl font-black leading-tight tracking-[-1px] text-white md:text-5xl">
          {t("title")}
        </h1>

        <p className="mb-7 text-base text-white/85">{t("subtitle")}</p>

        {!isOfficePage && !isMoveOutPage && (
          <div className="flex flex-col items-center gap-3">
            <PillToggle
              options={[t("serviceToggle.0"), t("serviceToggle.1")]}
              selected={serviceType === "maintenance" ? 0 : 1}
              onChange={onServiceChange}
            />
            <PillToggle
              options={[t("vatToggle.0"), t("vatToggle.1")]}
              selected={showDeducted ? 1 : 0}
              onChange={onVatChange}
              small
            />
          </div>
        )}

        {isMoveOutPage && (
          <div className="flex flex-col items-center gap-3">
            <PillToggle
              options={[t("vatToggle.0"), t("vatToggle.1")]}
              selected={showDeducted ? 1 : 0}
              onChange={onVatChange}
              small
            />
          </div>
        )}

        <TrustBar />
      </div>
    </div>
  );
}
