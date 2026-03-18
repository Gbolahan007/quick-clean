"use client";

import { useTranslations } from "next-intl";
import { Briefcase, Calendar, Brain } from "lucide-react";

export default function ProblemSection() {
  const t = useTranslations("landing.problem");

  const painPoints = [
    {
      icon: Briefcase,
      title: t("workdays.title"),
      subtitle: t("workdays.subtitle"),
    },
    {
      icon: Calendar,
      title: t("weekends.title"),
      subtitle: t("weekends.subtitle"),
    },
    {
      icon: Brain,
      title: t("mental.title"),
      subtitle: t("mental.subtitle"),
    },
  ];

  return (
    <section className="py-20 bg-[#f7f6f3]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
            {t("headline")}
          </h2>
        </div>

        {/* Three Column Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center"
              >
                {/* Icon */}
                <div className="mb-4">
                  <Icon className="h-12 w-12 text-black" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-black mb-2">
                  {point.title}
                </h3>

                {/* Subtitle */}
                <p className="text-base text-black">{point.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom Text */}
        <div className="text-center">
          <p className="text-lg text-black leading-relaxed max-w-3xl mx-auto">
            {t("conclusion")}
          </p>
        </div>
      </div>
    </section>
  );
}
