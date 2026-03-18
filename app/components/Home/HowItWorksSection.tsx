"use client";

import { useTranslations, useLocale } from "next-intl";

export default function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  const steps = [
    {
      number: "1",
      title: t("step1.title"),
      description: t("step1.description"),
    },
    {
      number: "2",
      title: t("step2.title"),
      description: t("step2.description"),
    },
    {
      number: "3",
      title: t("step3.title"),
      description: t("step3.description"),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#7c9885]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className={`${isFinnish ? "text-2xl sm:text-3xl lg:text-4xl" : "text-3xl sm:text-4xl lg:text-5xl"} font-bold text-white mb-4`}
          >
            {t("headline")}
          </h2>
        </div>

        {/* Steps with connecting lines */}
        <div className="relative max-w-5xl mx-auto">
          {/* Desktop: Horizontal connector line */}
          <div
            className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-white/30"
            style={{
              left: "calc(16.666% + 2rem)",
              right: "calc(16.666% + 2rem)",
            }}
          />

          {/* Mobile: Vertical connector line */}
          <div
            className="md:hidden absolute left-8 top-0 bottom-0 w-0.5 bg-white/30"
            style={{
              top: "calc(2rem + 20px)",
              bottom: "calc(2rem + 20px)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative flex md:flex-col items-start md:items-center"
              >
                {/* Mobile: horizontal layout */}
                <div className="md:hidden flex items-start gap-6 w-full">
                  {/* Number Circle */}
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-full border-2 border-white bg-transparent flex items-center justify-center relative z-10">
                      <span className="text-2xl font-bold text-white">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <h3
                      className={`${isFinnish ? "text-lg" : "text-xl"} font-bold text-white mb-2 leading-tight`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`${isFinnish ? "text-sm" : "text-base"} text-white/90 leading-relaxed`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Desktop: vertical layout */}
                <div className="hidden md:flex md:flex-col md:items-center md:text-center w-full">
                  {/* Number Circle */}
                  <div className="mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full border-2 border-white bg-[#7c9885] flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3
                      className={`${isFinnish ? "text-lg" : "text-xl"} font-bold text-white mb-3 leading-tight`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`${isFinnish ? "text-sm" : "text-base"} text-white/90 leading-relaxed`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reassurance */}
        <div className="mt-16 text-center">
          <p
            className={`${isFinnish ? "text-sm" : "text-base"} text-white max-w-2xl mx-auto`}
          >
            {t("reassurance")}
          </p>
        </div>
      </div>
    </section>
  );
}
