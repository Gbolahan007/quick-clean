// app/lib/seo/schema.ts
// ─────────────────────────────────────────────────────────────────────────────
// Schema.org JSON-LD builders.
//
// WHY THIS MATTERS MOST FOR YOU: LocalBusiness schema is how Google connects
// your website to your Google Business Profile and understands that you are a
// physical service business operating in a specific place. For a local
// cleaning company this is the single highest-leverage structured data type —
// it feeds the map pack, the knowledge panel, and "cleaning services near me".
//
// HONESTY RULE — read before adding ratings:
// AggregateRating and Review markup must reflect real, verifiable, first-party
// reviews that are ALSO visible on the page. Fabricated or invisible ratings
// are a documented cause of manual action penalties. The builder below exists
// but deliberately returns null unless you pass genuine data.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BASE_URL,
  BUSINESS,
  SERVICE_AREA,
  SERVICES,
  absoluteUrl,
  type Locale,
  type ServiceDefinition,
} from "./config";

// Loose typing — JSON-LD is structurally open and over-typing it fights the spec.
type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdObject = { [key: string]: JsonLdValue };

const ORG_ID = `${BASE_URL}/#organization`;
const WEBSITE_ID = `${BASE_URL}/#website`;

// ── Shared fragments ──────────────────────────────────────────────────────────

function postalAddress(): JsonLdObject {
  return {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.street,
    addressLocality: BUSINESS.address.locality,
    addressRegion: BUSINESS.address.region,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.country,
  };
}

function geoCoordinates(): JsonLdObject {
  return {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.geo.latitude,
    longitude: BUSINESS.geo.longitude,
  };
}

function openingHoursSpecification(): JsonLdObject[] {
  return BUSINESS.openingHours.map((slot) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: slot.days.map((d) => `https://schema.org/${d}`),
    opens: slot.opens,
    closes: slot.closes,
  }));
}

/**
 * areaServed as a radius around the business, plus explicit named cities.
 * The radius helps Google understand coverage; the named cities help you
 * surface for "{service} {city}" queries without dedicated pages existing yet.
 */
function areaServed(): JsonLdValue[] {
  return [
    {
      "@type": "GeoCircle",
      geoMidpoint: geoCoordinates(),
      geoRadius: SERVICE_AREA.radiusMeters,
    },
    ...SERVICE_AREA.cities.map((city) => ({
      "@type": "City",
      name: city,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: SERVICE_AREA.region,
      },
    })),
  ];
}

// ── Organization ──────────────────────────────────────────────────────────────

export function organizationSchema(): JsonLdObject {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.tradeName,
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    address: postalAddress(),
    vatID: BUSINESS.vatId,
    taxID: BUSINESS.businessId,
    foundingDate: BUSINESS.foundingDate,
    ...(BUSINESS.sameAs.length > 0 ? { sameAs: [...BUSINESS.sameAs] } : {}),
  };
}

// ── LocalBusiness (homepage) ──────────────────────────────────────────────────

export interface LocalBusinessOptions {
  locale: Locale;
  /**
   * Real, first-party review data ONLY. Must also be rendered visibly on the
   * page. Omit entirely until you have genuine reviews — omission costs you
   * nothing, fabrication risks a manual penalty.
   */
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
  };
}

export function localBusinessSchema(
  options: LocalBusinessOptions,
): JsonLdObject {
  const { locale, aggregateRating } = options;

  return {
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": `${BASE_URL}/#localbusiness`,
    name: BUSINESS.tradeName,
    legalName: BUSINESS.legalName,
    description:
      locale === "fi"
        ? "Ammattimainen koti- ja toimistosiivous Tampereella ja Pirkanmaalla. Luotettavat ja vakuutetut siivoojat, joustavat tilaukset ja kotitalousvähennyskelpoisuus."
        : "Professional home and office cleaning in Tampere and Pirkanmaa. Vetted, insured cleaners, flexible subscriptions, and eligibility for the Finnish household tax deduction.",
    url: absoluteUrl(locale),
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: `${BASE_URL}/og/default.png`,
    logo: `${BASE_URL}/logo.png`,
    address: postalAddress(),
    geo: geoCoordinates(),
    openingHoursSpecification: openingHoursSpecification(),
    areaServed: areaServed(),
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: BUSINESS.currency,
    paymentAccepted: "Credit Card, Debit Card",
    vatID: BUSINESS.vatId,
    taxID: BUSINESS.businessId,
    parentOrganization: { "@id": ORG_ID },
    knowsLanguage: ["fi", "en"],
    hasOfferCatalog: offerCatalogSchema(locale),
    ...(BUSINESS.sameAs.length > 0 ? { sameAs: [...BUSINESS.sameAs] } : {}),
    ...(aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.ratingValue,
            reviewCount: aggregateRating.reviewCount,
            bestRating: aggregateRating.bestRating ?? 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

// ── Offer catalog ─────────────────────────────────────────────────────────────

function offerCatalogSchema(locale: Locale): JsonLdObject {
  return {
    "@type": "OfferCatalog",
    name: locale === "fi" ? "Siivouspalvelut" : "Cleaning Services",
    itemListElement: SERVICES.map((service, index) => ({
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: service.name[locale],
        description: service.description[locale],
        serviceType: service.category,
        url: absoluteUrl(locale, service.path),
      },
      ...(service.priceFrom !== null
        ? {
            price: service.priceFrom,
            priceCurrency: BUSINESS.currency,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: service.priceFrom,
              priceCurrency: BUSINESS.currency,
              valueAddedTaxIncluded: true,
              ...(service.priceUnit
                ? { unitCode: service.priceUnit === "Month" ? "MON" : "E48" }
                : {}),
            },
          }
        : {}),
      availability: "https://schema.org/InStock",
      areaServed: areaServed(),
    })),
  };
}

// ── Service page ──────────────────────────────────────────────────────────────

export function serviceSchema(
  service: ServiceDefinition,
  locale: Locale,
): JsonLdObject {
  const url = absoluteUrl(locale, service.path);

  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.name[locale],
    description: service.description[locale],
    serviceType: service.category,
    url,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${BASE_URL}/#localbusiness`,
      name: BUSINESS.tradeName,
      address: postalAddress(),
      telephone: BUSINESS.phone,
    },
    areaServed: areaServed(),
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: absoluteUrl(locale, "/booking"),
      servicePhone: {
        "@type": "ContactPoint",
        telephone: BUSINESS.phone,
        contactType: "customer service",
        availableLanguage: ["Finnish", "English"],
      },
    },
    ...(service.priceFrom !== null
      ? {
          offers: {
            "@type": "Offer",
            price: service.priceFrom,
            priceCurrency: BUSINESS.currency,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(locale, "/booking"),
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: service.priceFrom,
              priceCurrency: BUSINESS.currency,
              valueAddedTaxIncluded: true,
              ...(service.priceUnit
                ? { unitCode: service.priceUnit === "Month" ? "MON" : "E48" }
                : {}),
            },
          },
        }
      : {}),
  };
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  /** Path without locale prefix. */
  path: string;
}

/**
 * Breadcrumbs replace the raw URL in Google results with a readable trail,
 * which measurably improves click-through rate on deep pages.
 */
export function breadcrumbSchema(
  items: BreadcrumbItem[],
  locale: Locale,
): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  /** Plain text. Must match what is visibly rendered on the page. */
  answer: string;
}

/**
 * FAQPage markup can win expanded SERP real estate. Google requires the
 * questions and answers to be visible on the page — markup-only FAQs are a
 * guideline violation. Returns null for an empty list so callers can spread
 * safely.
 */
export function faqSchema(items: FaqItem[]): JsonLdObject | null {
  if (items.length === 0) return null;

  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// ── WebSite ───────────────────────────────────────────────────────────────────

export function websiteSchema(locale: Locale): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: BASE_URL,
    name: BUSINESS.tradeName,
    inLanguage: locale,
    publisher: { "@id": ORG_ID },
  };
}

// ── Offer catalog page ────────────────────────────────────────────────────────

/**
 * Standalone ItemList schema for the /pricing index page.
 * Different from the offerCatalog embedded inside localBusinessSchema —
 * that one describes the business's catalogue; this one describes the page
 * itself as a list, which is what Google expects on a pricing/listing route.
 */
export function offerCatalogPageSchema(locale: Locale): JsonLdObject {
  return {
    "@type": "ItemList",
    name:
      locale === "fi"
        ? "Siivouspalvelut — hinnasto"
        : "Cleaning Services — Pricing",
    description:
      locale === "fi"
        ? "Frosh tarjoaa kotisiivous-, toimistosiivous- ja muuttosiivouspalveluja Tampereella kotitalousvähennyskelpoisin hinnoin."
        : "Frosh offers home cleaning, office cleaning, and move-out cleaning in Tampere at prices eligible for the Finnish household tax deduction.",
    url: absoluteUrl(locale, "/pricing"),
    numberOfItems: SERVICES.length,
    itemListElement: SERVICES.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: service.name[locale],
      url: absoluteUrl(locale, service.path),
      ...(service.priceFrom !== null
        ? {
            offers: {
              "@type": "Offer",
              price: service.priceFrom,
              priceCurrency: BUSINESS.currency,
              availability: "https://schema.org/InStock",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: service.priceFrom,
                priceCurrency: BUSINESS.currency,
                valueAddedTaxIncluded: true,
                ...(service.priceUnit
                  ? { unitCode: service.priceUnit === "Month" ? "MON" : "E48" }
                  : {}),
              },
            },
          }
        : {}),
    })),
  };
}

// ── Graph assembly ────────────────────────────────────────────────────────────

/**
 * Wraps schema nodes in a single @graph. One script tag per page beats several
 * disconnected ones — it lets nodes cross-reference by @id, which is how Google
 * understands that the Organization, the LocalBusiness, and the Service are all
 * the same entity rather than three unrelated things.
 */
export function buildGraph(
  nodes: (JsonLdObject | null | undefined)[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(
      (n): n is JsonLdObject => n !== null && n !== undefined,
    ),
  };
}
