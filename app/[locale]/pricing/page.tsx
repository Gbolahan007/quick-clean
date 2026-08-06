import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { JsonLd } from "@/app/components/seo/JsonLd";
import {
  buildGraph,
  breadcrumbSchema,
  offerCatalogPageSchema,
} from "@/app/lib/seo/schema";
import { buildMetadata } from "@/app/lib/seo/metadata";
import type { Locale } from "@/app/lib/seo/config";

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const tHero = await getTranslations({
    locale,
    namespace: "pricing.index.hero",
  });

  const title = tHero("title").replace("\n", " ");
  const description =
    locale === "fi"
      ? "Selkeä hinnoittelu kotisiivouspalveluille Tampereella. Ylläpitosiivous, syväsiivous ja muuttosiivous — kaikki kotitalousvähennyskelpoiset."
      : "Transparent pricing for cleaning services in Tampere. Home maintenance, deep cleaning, and move-out cleaning — all eligible for the Finnish household tax deduction.";

  return buildMetadata({
    locale: locale as Locale,
    path: "/pricing",
    title,
    description,
    keywords:
      locale === "fi"
        ? [
            "siivouspalvelu hinta Tampere",
            "kotisiivous hinnasto",
            "kotitalousvähennys siivous hinta",
          ]
        : [
            "cleaning service prices Tampere",
            "home cleaning cost Finland",
            "office cleaning quote Tampere",
          ],
  });
}

// ── Service card data ─────────────────────────────────────────────────────────

type ServiceKey = "homeCleaning" | "officeCleaning" | "moveOutCleaning";

const SERVICE_CARDS: { key: ServiceKey; href: string; accent: string }[] = [
  { key: "homeCleaning", href: "pricing/home-care", accent: "#7c9885" },
  { key: "officeCleaning", href: "pricing/office-cleaning", accent: "#4a7c6b" },
  { key: "moveOutCleaning", href: "pricing/moveout", accent: "#2d6b5a" },
];

// ── Service card — synchronous component (useTranslations is valid here) ───────

function ServiceCard({
  serviceKey,
  href,
  accent,
}: {
  serviceKey: ServiceKey;
  href: string;
  accent: string;
}) {
  const t = useTranslations(`pricing.index.services.${serviceKey}`);
  const features = t.raw("features") as string[];

  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-white rounded-2xl border border-gray-200 p-7 shadow-[0_2px_12px_rgba(10,22,40,0.05)] hover:shadow-[0_8px_28px_rgba(10,22,40,0.09)] hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-7 right-7 h-0.5 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
        aria-hidden
      />

      {/* Header */}
      <div className="mb-5">
        <h2 className="text-[17px] font-extrabold text-[#0a1628] tracking-tight mb-1.5">
          {t("title")}
        </h2>
        <p className="text-[13px] text-[#0a1628]/55 leading-relaxed">
          {t("description")}
        </p>
      </div>

      {/* Starting price */}
      <p
        className="text-[13px] font-bold mb-5 pb-5 border-b border-gray-100"
        style={{ color: accent }}
      >
        {t("startingFrom")}
      </p>

      {/* Features */}
      <ul className="space-y-2 mb-7 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span
              className="mt-0.5 text-[11px] shrink-0"
              style={{ color: accent }}
              aria-hidden
            >
              ✓
            </span>
            <span className="text-[12px] text-[#0a1628]/65 leading-snug">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors duration-200"
        style={{ color: accent }}
      >
        {t("cta")}
        <ArrowRight
          size={13}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

export default async function PricingIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Async server component → must use getTranslations, not the useTranslations hook.
  const t = await getTranslations({ locale, namespace: "pricing.index" });

  const graph = buildGraph([
    breadcrumbSchema(
      [
        { name: locale === "fi" ? "Etusivu" : "Home", path: "" },
        { name: locale === "fi" ? "Hinnoittelu" : "Pricing", path: "/pricing" },
      ],
      locale as Locale,
    ),
    // Now actually used — this is what was triggering the unused-import warning.
    offerCatalogPageSchema(locale as Locale),
  ]);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <JsonLd graph={graph} id="pricing-schema" />

      <div className="mx-auto max-w-5xl px-5 pt-24 pb-4">
        {/* Hero */}
        <header className="text-center mb-14">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885] mb-4">
            {t("hero.eyebrow")}
          </span>

          <h1 className="text-[36px] sm:text-[46px] font-extrabold text-[#0a1628] tracking-tight leading-[1.1] mb-4 whitespace-pre-line">
            {t("hero.title")}
          </h1>

          <p className="text-[15px] text-[#0a1628]/50 leading-relaxed max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {SERVICE_CARDS.map(({ key, href, accent }) => (
            <ServiceCard
              key={key}
              serviceKey={key}
              href={href}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
