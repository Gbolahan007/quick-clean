import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing.index.hero" });
  return { title: t("title").replace("\n", " ") };
}

// ── Service card data ─────────────────────────────────────────────────────────

type ServiceKey = "homeCleaning" | "officeCleaning" | "moveOutCleaning";

const SERVICES: { key: ServiceKey; href: string; accent: string }[] = [
  {
    key: "homeCleaning",
    href: "pricing/home-care",
    accent: "#7c9885",
  },
  {
    key: "officeCleaning",
    href: "pricing/office-cleaning",
    accent: "#4a7c6b",
  },
  {
    key: "moveOutCleaning",
    href: "pricing/moveout",
    accent: "#2d6b5a",
  },
];

// ── Service card ──────────────────────────────────────────────────────────────

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
        className="absolute  top-0 left-7 right-7 h-0.5 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 "
        style={{ background: accent }}
        aria-hidden
      />

      {/* Header */}
      <div className="mb-5 ">
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingIndexPage({}: {
  params: Promise<{ locale: string }>;
}) {
  const t = useTranslations("pricing.index");

  return (
    <div className="min-h-screen  bg-[#f8faf9]">
      <div className="mx-auto max-w-5xl px-5 pt-24 pb-4">
        {/* Hero */}
        <div className="text-center mb-14">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885] mb-4">
            {t("hero.eyebrow")}
          </span>

          <h1 className="text-[36px] sm:text-[46px] font-extrabold text-[#0a1628] tracking-tight leading-[1.1] mb-4 whitespace-pre-line">
            {t("hero.title")}
          </h1>

          <p className="text-[15px] text-[#0a1628]/50 leading-relaxed max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {SERVICES.map(({ key, href, accent }) => (
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
