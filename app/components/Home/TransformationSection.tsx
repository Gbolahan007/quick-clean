"use client";

import { useTranslations, useLocale } from "next-intl";
import { Check } from "lucide-react";
import Image from "next/image";

export default function TransformationSection() {
  const t = useTranslations("landing.transformation");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  const benefits = [
    t("benefits.0"),
    t("benefits.1"),
    t("benefits.2"),
    t("benefits.3"),
    t("benefits.4"),
  ];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Image */}
          <div className="relative h-96 lg:h-125 rounded-2xl overflow-hidden shadow-xl order-2 lg:order-1">
            <Image
              src="/clean-room.jpg"
              alt="Clean and organized living room"
              fill
              className="object-cover"
            />
          </div>

          {/* Right: Content */}
          <div className="order-1 lg:order-2">
            <h2
              className={`${isFinnish ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"} font-bold text-black mb-6 leading-tight`}
            >
              {t("headline")}
            </h2>

            {/* Checklist of benefits */}
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <Check className="w-5 h-5 text-black" strokeWidth={2} />
                  </div>
                  <p
                    className={`${isFinnish ? "text-base" : "text-lg"} text-black leading-relaxed`}
                  >
                    {benefit}
                  </p>
                </div>
              ))}
            </div>

            {/* Conclusion text */}
            <p
              className={`${isFinnish ? "text-base" : "text-lg"} text-black leading-relaxed font-normal`}
            >
              {t("conclusion")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
