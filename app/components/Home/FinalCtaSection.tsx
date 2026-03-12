"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

export default function FinalCtaSection() {
  const t = useTranslations("landing.finalCta");

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6">
          {t("headline")}
        </h2>

        {/* Description */}
        <p className="text-lg sm:text-xl text-gray-700 mb-6 leading-relaxed">
          {t("description")}
        </p>

        {/* Benefits */}
        <p className="text-xl font-semibold text-black mb-10">
          {t("benefits")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/quote"
            className="px-8 py-4 bg-[#e07a5f] text-white rounded-full font-semibold text-lg hover:bg-[#c96a4f] transition-all shadow-lg hover:shadow-xl"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 bg-white border-2 border-gray-300 text-black rounded-full font-semibold text-lg hover:border-[#e07a5f] hover:text-[#e07a5f] transition-all"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
