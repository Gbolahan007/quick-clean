"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/navigation";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export default function FinalCtaSection() {
  const t = useTranslations("landing.finalCta");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/home.jpg"
          alt="Happy family relaxing at home"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2
          className={`${isFinnish ? "text-3xl sm:text-4xl" : "text-3xl sm:text-4xl lg:text-5xl"} font-bold text-white mb-6 leading-tight`}
        >
          {t("headline")}
        </h2>

        {/* Description */}
        <p
          className={`${isFinnish ? "text-base sm:text-lg" : "text-lg sm:text-xl"} text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto`}
        >
          {t("description")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/pricing/home-care"
            className={`${isFinnish ? "px-6 py-3 text-base" : "px-8 py-4 text-lg"} bg-[#7c9885] text-white rounded-full font-semibold hover:bg-[#6a8573] transition-all shadow-lg hover:shadow-xl`}
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/pricing"
            className={`${isFinnish ? "px-6 py-3 text-base" : "px-8 py-4 text-lg"} bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-full font-semibold hover:bg-white/20 transition-all`}
          >
            {t("ctaSecondary")}
          </Link>
        </div>

        {/* Additional link with arrow */}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
        >
          <span className={`${isFinnish ? "text-sm" : "text-base"}`}>
            {t("ctaLink")}
          </span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
