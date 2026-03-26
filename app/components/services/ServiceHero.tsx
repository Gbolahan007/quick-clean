"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";

export default function ServiceHero() {
  const t = useTranslations("services.hero");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  return (
    <section className="relative min-h-160 lg:min-h-150 flex items-center overflow-hidden">
      {/* Background Image */}
      <Image
        src="/services3.jpg"
        alt="Clean modern living space"
        fill
        priority
        className="object-cover"
      />

      {/* Dark gradient overlay — heavier on left for text legibility */}
      <div className="absolute inset-0 bg-linear-to-r from-gray-900/85 via-gray-900/60 to-gray-900/25" />

      {/* Subtle green tint at bottom edge */}
      <div className="absolute inset-0 bg-linear-to-t from-[#7c9885]/25 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-2xl">
          {/* Eyebrow tag */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#7c9885] animate-pulse" />
            <span className="text-white/90 text-sm font-medium tracking-wide uppercase">
              QuickClean Services
            </span>
          </div>

          {/* Headline */}
          <h1
            className={`${
              isFinnish ? "text-4xl md:text-5xl" : "text-5xl md:text-6xl"
            } font-bold text-white leading-tight mb-6`}
          >
            {t("headline")}
          </h1>

          {/* Description */}
          <p
            className={`${
              isFinnish ? "text-lg" : "text-xl"
            } text-white/80 leading-relaxed mb-10 max-w-xl`}
          >
            {t("description")}
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3">
            {[t("trustedInsured"), t("vettedCleaners"), t("flexiblePlans")].map(
              (badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2"
                >
                  <span className="text-[#7c9885] text-sm">✓</span>
                  <span className="text-white/90 text-sm font-medium">
                    {badge}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-white to-transparent" />
    </section>
  );
}
