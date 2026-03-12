"use client";

import { useTranslations } from "next-intl";
import { Clock, Calendar, Frown, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function ProblemSection() {
  const t = useTranslations("landing.problem");

  const painPoints = [
    {
      icon: Clock,
      text: t("points.0"), // Floors need attention
    },
    {
      icon: Frown,
      text: t("points.1"), // The bathroom needs care
    },
    {
      icon: Calendar,
      text: t("points.2"), // The kitchen never stays done
    },
    {
      icon: AlertCircle,
      text: t("points.3"), // Even when you try to relax...
    },
  ];

  return (
    <section className="py-20 bg-linear-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#e07a5f] rounded-full opacity-5 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gray-400 rounded-full opacity-5 translate-x-1/2 translate-y-1/2"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Image */}
          <div className="relative h-100 lg:h-155 rounded-xl overflow-hidden shadow-xl order-2 lg:order-1">
            <Image
              src="/messy.JPG"
              alt="messy home"
              fill
              className="object-cover grayscale"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>

            {/* Quote overlay on image */}
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-white text-xl font-medium italic">
                &ldquo;We should really clean...&ldquo;
              </p>
            </div>
          </div>

          {/* Right: Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
              {t("headline")}
            </h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              {t("intro")}
            </p>

            {/* Pain Points Grid */}
            <div className="space-y-4 mb-8">
              {painPoints.map((point, index) => {
                const Icon = point.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-[#e07a5f] transition-colors"
                  >
                    <div className="shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <p className="text-lg text-gray-700 leading-relaxed flex-1">
                      {point.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Conclusion */}
            <div className="bg-[#e07a5f] bg-opacity-10 border-l-4 border-[#e07a5f] p-6 rounded-r-lg ">
              <p className="text-lg font-medium text-white leading-relaxed">
                {t("conclusion")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
