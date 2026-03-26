"use client";

import { Link } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight } from "lucide-react";
import ServiceHero from "../../components/services/ServiceHero";
import ServiceCard from "../../components/services/ServicesCard";
import ServiceChecklist from "../../components/services/ChecklistSection";
import Image from "next/image";

export default function ServicesPage() {
  const t = useTranslations("services");
  const tOffice = useTranslations("services.officeSection");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  const officeFeatures = [
    "halls",
    "meetingRooms",
    "kitchen",
    "restrooms",
  ] as const;

  return (
    <main
      className="min-h-screen bg-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');

        :root {
          --sage: #7c9885;
          --sage-light: #a8bfb0;
          --sage-dark: #5a7363;
          --sage-muted: #f0f4f1;
          --sage-border: #d4e0d8;
        }

        .section-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--sage);
        }

        .display-heading {
          font-family: 'DM Serif Display', serif;
          font-weight: 400;
        }

        .office-feature {
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .office-feature:hover {
          background: white !important;
          transform: translateY(-2px);
        }

        .cta-btn-primary {
          background: white;
          color: var(--sage-dark);
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .cta-btn-primary:hover {
          background: #f5f9f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }

        .cta-btn-secondary {
          border: 2px solid rgba(255,255,255,0.35);
          color: white;
          transition: background 0.2s, transform 0.2s;
        }
        .cta-btn-secondary:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-2px);
        }

        .divider-leaf {
          width: 36px;
          height: 3px;
          background: var(--sage);
          border-radius: 999px;
          display: inline-block;
        }

        .stat-card {
          transition: transform 0.3s ease;
        }
        .stat-card:hover {
          transform: scale(1.04);
        }
      `}</style>

      {/* ── Hero ── */}
      <ServiceHero />

      {/* ── Services Grid ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="flex flex-col items-center text-center mb-16 gap-3">
            <span className="section-label">{t("overview.headline")}</span>
            <span className="divider-leaf" />
            <p
              className={`${
                isFinnish ? "text-base" : "text-lg"
              } text-gray-400 max-w-lg mt-1`}
            >
              {t("overview.description")}
            </p>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* ── Checklist ── */}
      <ServiceChecklist />

      {/* ── Office Cleaning ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-3xl overflow-hidden grid lg:grid-cols-5"
            style={{
              background: "var(--sage-muted)",
              border: "1px solid var(--sage-border)",
            }}
          >
            {/* Left — content (3 cols) */}
            <div className="lg:col-span-3 p-10 lg:p-14 flex flex-col justify-center">
              <span className="section-label mb-3 block">Office</span>

              <h2
                className={`display-heading ${
                  isFinnish ? "text-3xl lg:text-4xl" : "text-4xl lg:text-5xl"
                } text-gray-900 leading-tight mb-4`}
              >
                {tOffice("headline")}
              </h2>

              <p
                className={`${
                  isFinnish ? "text-sm" : "text-base"
                } text-gray-500 mb-10 leading-relaxed max-w-md`}
              >
                {tOffice("description")}
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mb-10">
                {officeFeatures.map((key) => (
                  <div
                    key={key}
                    className="office-feature flex items-start gap-3 p-4 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid var(--sage-border)",
                    }}
                  >
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 text-xs font-bold"
                      style={{ background: "var(--sage)", color: "white" }}
                    >
                      ✓
                    </div>
                    <div>
                      <h3
                        className={`font-semibold text-gray-800 mb-0.5 ${
                          isFinnish ? "text-sm" : "text-sm"
                        }`}
                      >
                        {tOffice(`${key}.title`)}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {tOffice(`${key}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Link
                  href="/services/office"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white text-sm transition-all duration-200 hover:gap-3 hover:opacity-90 hover:-translate-y-0.5"
                  style={{ background: "var(--sage)" }}
                >
                  {tOffice("cta")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right — stats panel (2 cols) */}
            <div
              className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center gap-8 p-14"
              style={{ background: "var(--sage)" }}
            >
              {[
                { value: "500+", label: "Spaces cleaned" },
                { value: "4.9★", label: "Customer rating" },
                { value: "100%", label: "Insured service" },
              ].map((stat) => (
                <div
                  key={stat.value}
                  className="stat-card text-center w-full px-6 py-6 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div className="display-heading text-5xl text-white mb-1">
                    {stat.value}
                  </div>
                  <div
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-14 relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/services2.jpg"
          alt="Clean professional space"
          fill
          className="object-cover"
        />

        {/* Dark + sage overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-gray-900/80 via-gray-900/65 to-gray-900/50" />
        <div className="absolute inset-0 bg-linear-to-t from-[#7c9885]/40 via-transparent to-transparent" />

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow */}
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase mb-8 px-5 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >
            Get Started
          </span>

          <h2
            className={`display-heading ${
              isFinnish ? "text-3xl md:text-4xl" : "text-4xl md:text-[3.25rem]"
            } text-white leading-tight mb-5`}
          >
            {t("finalCta.headline")}
          </h2>

          <p
            className={`${
              isFinnish ? "text-base" : "text-lg"
            } mb-2 leading-relaxed`}
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            {t("finalCta.subtitle")}
          </p>

          <p
            className="text-sm mb-12 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {t("finalCta.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="cta-btn-primary inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-sm shadow-xl"
            >
              {t("finalCta.primaryCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="cta-btn-secondary inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-sm"
            >
              {t("finalCta.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
