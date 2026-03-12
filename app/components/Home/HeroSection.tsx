"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import Image from "next/image";

export default function HeroSection() {
  const t = useTranslations("landing.hero");

  const trustAvatars = [
    { src: "/face1.jpg", alt: "Happy customer" },
    { src: "/face2.jpg", alt: "Happy customer" },
    { src: "/face3.jpg", alt: "Happy customer" },
    { src: "/face4.jpg", alt: "Happy customer" },
  ];

  return (
    <section className="relative min-h-160 lg:min-h-150 flex items-center py-12">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pix2.jpg"
          alt="Clean Nordic apartment with relaxed couple"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 w-full">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
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

          {/* Trust row — avatars + text */}
          <div className="flex items-center gap-3">
            {/* Stacked avatars */}
            <div className="flex -space-x-3">
              {trustAvatars.map((avatar, index) => (
                <div
                  key={index}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white overflow-hidden shrink-0 relative"
                >
                  <Image
                    src={avatar.src}
                    alt={avatar.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Trust text */}
            <p className="text-sm text-gray-200">{t("trustText")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
