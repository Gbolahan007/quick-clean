"use client";

import { useTranslations } from "next-intl";
import { Home, Calendar, Users, Heart, Sparkles } from "lucide-react";

export default function TransformationSection() {
  const t = useTranslations("landing.transformation");

  const benefits = [
    { icon: Home, text: t("benefits.0") },
    { icon: Calendar, text: t("benefits.1") },
    { icon: Users, text: t("benefits.2") },
    { icon: Heart, text: t("benefits.3") },
    { icon: Sparkles, text: t("benefits.4") },
  ];

  return (
    <section className="py-24 bg-[#f7f6f3]">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Header — left-aligned, no fuss */}
        <div className="mb-20 border-t-2 border-gray-900 pt-8 max-w-2xl">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-950 leading-tight tracking-tight mb-6">
            {t("headline")}
          </h2>
          <p className="text-base text-gray-500 leading-relaxed mb-2">
            {t("intro")}
          </p>
          <p className="text-base text-gray-400 leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Benefits — 2-col, dividers only, no cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const isRightCol = index % 2 === 1;
            const isLastRow =
              index >= benefits.length - (benefits.length % 2 || 2);

            return (
              <div
                key={index}
                className={`
                  flex items-start gap-5 py-8
                  border-t border-gray-200
                  ${isRightCol ? "sm:pl-10 sm:border-l" : "sm:pr-10"}
                  ${isLastRow ? "border-b" : ""}
                `}
              >
                <div className="shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-[#e07a5f]" strokeWidth={1.5} />
                </div>
                <p className="text-base text-gray-700 leading-relaxed">
                  {benefit.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Conclusion — sparse, typographic */}
        <div className="mt-16 pt-6 border-t border-gray-200 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:gap-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gray-400">
            {t("subtitle")}
          </span>

          <p className="text-base text-gray-600 leading-relaxed">
            {t("conclusion")}
          </p>
        </div>
      </div>
    </section>
  );
}
