/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { Link } from "@/navigation";
import { ArrowRight, type LucideProps } from "lucide-react";
import { useTranslations, useLocale, useMessages } from "next-intl";
import type { ComponentType } from "react";

interface ServiceCardProps {
  icon: ComponentType<LucideProps>;
  serviceKey: string;
  href: string;
  popular?: boolean;
}

export default function ServiceCard({
  icon: Icon,
  serviceKey,
  href,
  popular = false,
}: ServiceCardProps) {
  const t = useTranslations(`services.cards.${serviceKey}`);
  const tCommon = useTranslations("services");
  const locale = useLocale();
  const isFinnish = locale === "fi";
  const messages = useMessages();

  const cardMessages = (messages as any)?.services?.cards?.[serviceKey];
  const featureCount = Array.isArray(cardMessages?.features)
    ? cardMessages.features.length
    : 0;

  const features = Array.from({ length: featureCount }, (_, i) =>
    t(`features.${i}`),
  );

  return (
    <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {popular && (
        <div className="absolute -top-4 right-8 bg-[#7c9885] text-white px-4 py-1 rounded-full text-sm font-semibold">
          {tCommon("mostPopular")}
        </div>
      )}

      {/* Lucide icon replacing the emoji string */}
      <div className="w-12 h-12 rounded-xl bg-[#f0f4f1] flex items-center justify-center mb-4 text-[#7c9885] transition-colors duration-200 group-hover:bg-[#7c9885] group-hover:text-white">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3
        className={`${isFinnish ? "text-xl" : "text-2xl"} font-bold text-gray-900 mb-3 group-hover:text-[#7c9885] transition-colors`}
      >
        {t("title")}
      </h3>

      <p
        className={`${isFinnish ? "text-sm" : "text-base"} text-gray-600 mb-6 leading-relaxed`}
      >
        {t("description")}
      </p>

      {features.length > 0 && (
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li
              key={index}
              className={`flex items-start text-gray-700 ${isFinnish ? "text-sm" : "text-base"}`}
            >
              <span className="text-[#7c9885] mr-2 mt-1">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={href}
        className="inline-flex items-center text-[#7c9885] font-semibold group-hover:gap-2 transition-all"
      >
        {tCommon("learnMore")}
        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
