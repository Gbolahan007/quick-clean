"use client";

import { useTranslations } from "next-intl";

export default function TestimonialsSection() {
  const t = useTranslations("landing.testimonials");

  const testimonials = [
    {
      quote: t("testimonial1.quote"),
      author: t("testimonial1.author"),
    },
    {
      quote: t("testimonial2.quote"),
      author: t("testimonial2.author"),
    },
  ];

  const metrics = [
    { value: t("metrics.0.value"), label: t("metrics.0.label") },
    { value: t("metrics.1.value"), label: t("metrics.1.label") },
    { value: t("metrics.2.value"), label: t("metrics.2.label") },
  ];

  return (
    <section className="py-24 bg-[#f7f6f3]">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 border-t-2 border-gray-900 pt-8 max-w-2xl">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight leading-tight">
            {t("headline")}
          </h2>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 mb-10 border-t border-b border-gray-200 divide-x divide-gray-200">
          {metrics.map((metric, index) => (
            <div key={index} className="py-8 px-6 first:pl-0 last:pr-0">
              <p className="text-3xl sm:text-4xl font-bold text-gray-950 tracking-tight mb-1">
                {metric.value}
              </p>
              <p className="text-sm text-gray-500 leading-snug">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid sm:grid-cols-2 gap-px bg-gray-200">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-[#f7f6f3] py-10  px-8">
              <p className="text-base text-gray-700 leading-relaxed mb-6">
                &quot;{testimonial.quote}&quot;
              </p>
              <p className="text-sm font-semibold text-gray-900 tracking-wide">
                — {testimonial.author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
