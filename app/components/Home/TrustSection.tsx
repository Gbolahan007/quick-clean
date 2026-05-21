"use client";

import { Award, DollarSign, Heart, ShieldCheck, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

export default function TrustSection() {
  const t = useTranslations("landing.trust");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  const features = [
    {
      icon: Award,
      title: t("features.vetted.title"),
      description: t("features.vetted.description"),
    },
    {
      icon: Users,
      title: t("features.consistency.title"),
      description: t("features.consistency.description"),
    },
    {
      icon: ShieldCheck,
      title: t("features.insured.title"),
      description: t("features.insured.description"),
    },
    {
      icon: DollarSign,
      title: t("features.transparent.title"),
      description: t("features.transparent.description"),
    },
    {
      icon: Heart,
      title: t("features.respect.title"),
      description: t("features.respect.description"),
    },
  ];

  return (
    <section className="py-12  bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className={`${isFinnish ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"} font-bold text-black mb-4 leading-tight`}
          >
            {t("headline")}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-16">
          {/* Left: Image */}
          <div className="relative h-96 lg:h-112.5 rounded-2xl overflow-hidden shadow-lg order-2 lg:order-1">
            <Image
              src="/cleaning2.JPG"
              alt="Clean folded towels and plant"
              fill
              className="object-cover"
            />
          </div>

          {/* Right: Trust features list */}
          <div className="order-1 lg:order-2">
            <div className="space-y-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="shrink-0 mt-1">
                      <Icon className="w-6 h-6 text-black" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3
                        className={`${isFinnish ? "text-base" : "text-lg"} font-bold text-black mb-1`}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={`${isFinnish ? "text-sm" : "text-base"} text-gray-600 leading-relaxed`}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ethical Commitment Box */}
        <div className="max-w-4xl mx-auto bg-[#f7f6f3] border-l-4 border-black rounded-r-lg p-8">
          <h3
            className={`${isFinnish ? "text-lg" : "text-xl"} font-bold text-black mb-4`}
          >
            {t("features.ethical.title")}
          </h3>
          <p
            className={`${isFinnish ? "text-sm" : "text-base"} text-gray-700 leading-relaxed`}
          >
            {t("features.ethical.description")}
          </p>
        </div>
      </div>
    </section>
  );
}
