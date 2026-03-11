"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import Image from "next/image";

export default function HeroSection() {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative min-h-160 lg:min-h-150 flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pix2.jpg"
          alt="Clean Nordic apartment with relaxed couple"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 w-full ">
        <div className="max-w-2xl">
          {/* Text Content - Left Aligned */}
          <h1 className="text-4xl  sm:text-5xl lg:text-6xl  font-bold text-white leading-tight mb-6">
            {t("headline")}
            <br />
            <span className="text-gray-100">{t("subheadline")}</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-100 mb-8">
            {t("description")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 w-fit">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-[#e07a5f] text-white rounded-full font-semibold text-lg hover:bg-[#c96a4f] transition-all shadow-lg hover:shadow-xl"
            >
              {t("cta")}
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 bg-white border-2 border-white text-black rounded-full font-semibold text-lg hover:bg-transparent hover:text-white transition-all"
            >
              {t("ctaSecondary")}
            </Link>
          </div>

          {/* Trust Text */}
          <p className="text-sm text-gray-200 italic">{t("trustText")}</p>
        </div>
      </div>
    </section>
  );
}
