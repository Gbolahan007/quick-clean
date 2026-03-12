"use client";

import { useTranslations } from "next-intl";
import { Calendar, Sparkles, Home } from "lucide-react";

export default function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    {
      number: "1",
      icon: Calendar,
      title: t("step1.title"),
      description: t("step1.description"),
    },
    {
      number: "2",
      icon: Sparkles,
      title: t("step2.title"),
      description: t("step2.description"),
    },
    {
      number: "3",
      icon: Home,
      title: t("step3.title"),
      description: t("step3.description"),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#f7f6f3]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4">
            {t("headline")}
          </h2>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Step Number */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#e07a5f] flex items-center justify-center">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-black mb-3">
                    {step.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector Line (hidden on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-300 -z-10" />
                )}
              </div>
            );
          })}
        </div>

        {/* Reassurance */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 italic max-w-2xl mx-auto">
            {t("reassurance")}
          </p>
        </div>
      </div>
    </section>
  );
}
