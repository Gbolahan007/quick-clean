"use client";

import { Link } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import ServiceHero from "../../components/services/ServiceHero";
import ServiceCard from "../../components/services/ServicesCard";
import ServiceChecklist from "../../components/services/ChecklistSection";

export default function ServicesPage() {
  const t = useTranslations("services");
  const tCommon = useTranslations("services.officeSection");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <ServiceHero />

      {/* Core Services */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className={`${isFinnish ? "text-3xl" : "text-4xl"} font-bold text-gray-900 mb-4`}
            >
              {t("overview.headline")}
            </h2>
            <p
              className={`${isFinnish ? "text-lg" : "text-xl"} text-gray-600 max-w-2xl mx-auto`}
            >
              {t("overview.description")}
            </p>
          </div>

          {/* Service Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ServiceCard
              icon="🏠"
              serviceKey="homeCare"
              href="/services/home-care"
              popular={true}
            />
            <ServiceCard
              icon="🏢"
              serviceKey="office"
              href="/services/office"
            />
            <ServiceCard
              icon="✨"
              serviceKey="deepClean"
              href="/services/deep-clean"
            />
            <ServiceCard
              icon="🔑"
              serviceKey="airbnb"
              href="/services/airbnb"
            />
            <ServiceCard
              icon="📦"
              serviceKey="moveOut"
              href="/services/move-out"
            />
            <ServiceCard
              icon="🔨"
              serviceKey="renovation"
              href="/services/renovation"
            />
            <ServiceCard icon="⚓" serviceKey="yacht" href="/services/yacht" />
            <ServiceCard
              icon="💎"
              serviceKey="luxury"
              href="/services/luxury"
            />
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      {/* <ServiceChecklist /> */}

      {/* Office Cleaning Details */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-linear-to-br from-blue-50 to-white rounded-3xl p-12 border border-blue-100">
            <div className="max-w-3xl">
              <h2
                className={`${isFinnish ? "text-3xl" : "text-4xl"} font-bold text-gray-900 mb-6`}
              >
                {tCommon("headline")}
              </h2>
              <p
                className={`${isFinnish ? "text-lg" : "text-xl"} text-gray-600 mb-8`}
              >
                {tCommon("description")}
              </p>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                {(
                  ["halls", "meetingRooms", "kitchen", "restrooms"] as const
                ).map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">✓</span>
                    </div>
                    <div>
                      <h3
                        className={`font-semibold text-gray-900 mb-1 ${isFinnish ? "text-sm" : "text-base"}`}
                      >
                        {tCommon(`${key}.title`)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {tCommon(`${key}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/services/office"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                {tCommon("cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className={`${isFinnish ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl"} font-bold mb-6`}
          >
            {t("finalCta.headline")}
          </h2>
          <p
            className={`${isFinnish ? "text-lg md:text-xl" : "text-xl md:text-2xl"} mb-4 text-emerald-100`}
          >
            {t("finalCta.subtitle")}
          </p>
          <p className="text-lg mb-10 text-emerald-100">
            {t("finalCta.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="px-8 py-4 bg-white text-emerald-600 rounded-full font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              {t("finalCta.primaryCta")}
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-emerald-700 text-white rounded-full font-semibold hover:bg-emerald-800 transition-colors border-2 border-white/30"
            >
              {t("finalCta.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
