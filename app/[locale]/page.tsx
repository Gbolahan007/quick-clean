// app/[locale]/page.tsx
import type { Metadata } from "next";
import FinalCtaSection from "../components/Home/FinalCtaSection";
import HeroSection from "../components/Home/HeroSection";
import HowItWorksSection from "../components/Home/HowItWorksSection";
import ProblemSection from "../components/Home/ProblemSection";
import ServicesOverviewSection from "../components/Home/ServicesOverviewSection";
import SubscriptionSection from "../components/Home/SubscriptionSection";
import TrustSection from "../components/Home/TrustSection";
import { JsonLd } from "@/app/components/seo/JsonLd";
import {
  buildGraph,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from "@/app/lib/seo/schema";
import { buildMetadata } from "@/app/lib/seo/metadata";
import type { Locale } from "@/app/lib/seo/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const title =
    locale === "fi"
      ? "Siivouspalvelu Tampere — Frosh"
      : "Cleaning Service Tampere — Frosh";

  const description =
    locale === "fi"
      ? "Ammattimainen kotisiivous, toimistosiivous ja muuttosiivous Tampereella ja Pirkanmaalla. Luotettavat siivoojat, joustavat tilaukset, kotitalousvähennyskelpoiset hinnat."
      : "Professional home cleaning, office cleaning, and move-out cleaning in Tampere and Pirkanmaa. Vetted cleaners, flexible subscriptions, Finnish household tax deduction eligible.";

  return buildMetadata({
    locale: locale as Locale,
    path: "",
    title,
    description,
    keywords:
      locale === "fi"
        ? [
            "siivouspalvelu Tampere",
            "kotisiivous Tampere",
            "ylläpitosiivous",
            "toimistosiivous Tampere",
            "siivous Pirkanmaa",
            "kotitalousvähennys siivous",
          ]
        : [
            "cleaning service Tampere",
            "home cleaning Tampere",
            "office cleaning Finland",
            "cleaning subscription Tampere",
            "household tax deduction Finland",
          ],
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;

  const graph = buildGraph([
    organizationSchema(),
    websiteSchema(locale as Locale),
    localBusinessSchema({ locale: locale as Locale }),
  ]);

  return (
    <main>
      <JsonLd graph={graph} id="homepage-graph" />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <SubscriptionSection />
      <TrustSection />
      <ServicesOverviewSection />
      <FinalCtaSection />
    </main>
  );
}
