import {
  BASE_URL,
  BUSINESS,
  SERVICE_AREA,
  SERVICES,
  absoluteUrl,
  type Locale,
  type ServiceDefinition,
} from "./config";

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
  path: string;
}

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
  answer: string;
}

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
