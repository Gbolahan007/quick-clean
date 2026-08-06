import type { Metadata } from "next";
import { JsonLd } from "@/app/components/seo/JsonLd";
import {
  buildGraph,
  breadcrumbSchema,
  serviceSchema,
} from "@/app/lib/seo/schema";
import { buildMetadata } from "@/app/lib/seo/metadata";
import { SERVICES, type Locale } from "@/app/lib/seo/config";
import ServicesPage from "./ServicesPage ";

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
      ? "Siivouspalvelut Tampereella"
      : "Cleaning Services Tampere";
  const description =
    locale === "fi"
      ? "Kaikki siivouspalvelumme yhdessä paikassa — kotisiivous, toimistosiivous, muuttosiivous, syväsiivous, Airbnb-siivous ja remonttisiivous Tampereella."
      : "All our cleaning services in one place — home care, office, move-out, deep cleaning, Airbnb turnover, and post-renovation cleaning in Tampere.";

  return buildMetadata({
    locale: locale as Locale,
    path: "/services",
    title,
    description,
    keywords:
      locale === "fi"
        ? [
            "siivouspalvelut Tampere",
            "kotisiivous",
            "toimistosiivous",
            "muuttosiivous Tampere",
            "syväsiivous",
          ]
        : [
            "cleaning services Tampere",
            "home cleaning",
            "office cleaning",
            "move out cleaning Finland",
            "deep cleaning Tampere",
          ],
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ServicesIndexPage({ params }: PageProps) {
  const { locale } = await params;

  const graph = buildGraph([
    breadcrumbSchema(
      [
        { name: locale === "fi" ? "Etusivu" : "Home", path: "" },
        { name: locale === "fi" ? "Palvelut" : "Services", path: "/services" },
      ],
      locale as Locale,
    ),
    ...SERVICES.map((service) => serviceSchema(service, locale as Locale)),
  ]);

  return (
    <>
      <JsonLd graph={graph} id="services-schema" />
      <ServicesPage />
    </>
  );
}
