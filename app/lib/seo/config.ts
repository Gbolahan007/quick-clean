// app/lib/seo/config.ts
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for SEO.
//
// NAP (Name, Address, Phone) consistency is a direct local-ranking factor.
// Google cross-references your site against Google Business Profile and
// third-party directories. Any mismatch in formatting weakens the match.
// Every surface that renders NAP — Footer, JSON-LD, contact page, emails —
// must read from here rather than hardcoding.
//
// Adding a route, locale, service, or city means editing ONLY this file.
// The sitemap, hreflang tags, and structured data all derive from it.
// ─────────────────────────────────────────────────────────────────────────────

// ── Locales ───────────────────────────────────────────────────────────────────

export const LOCALES = ["en", "fi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Maps app locale → BCP-47 tag used in hreflang and og:locale. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en_US",
  fi: "fi_FI",
};

export const HREFLANG_TAGS: Record<Locale, string> = {
  en: "en",
  fi: "fi",
};

// ── Site ──────────────────────────────────────────────────────────────────────

function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://frosh.fi";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const BASE_URL = resolveBaseUrl();

/**
 * Only the production domain should be indexed. Preview deployments and
 * localhost must never enter the index — duplicate content on a *.vercel.app
 * domain can outrank the real site.
 */
export const IS_INDEXABLE_ENV = BASE_URL === "https://frosh.fi";

// ── Business identity (NAP) ───────────────────────────────────────────────────

export const BUSINESS = {
  legalName: "Frosh Enterprises",
  tradeName: "Frosh",
  businessId: "3599859-5",
  vatId: "FI35998595", // ⚠️ CONFIRM: derived from Y-tunnus, verify at ytj.fi

  email: "hello@frosh.fi",
  phone: "+358503484537",
  phoneDisplay: "+358 50 348 4537",
  whatsapp: "358503484537",

  address: {
    street: "Näyttelijänkatu 19",
    locality: "Tampere",
    region: "Pirkanmaa",
    postalCode: "33720", // ⚠️ CONFIRM exact postal code
    country: "FI",
  },

  /**
   * ⚠️ CONFIRM: coordinates are the Näyttelijänkatu area centroid.
   * Replace with the exact registered-address pin from Google Maps —
   * proximity is a top-three local pack ranking factor.
   */
  geo: {
    latitude: 61.4858,
    longitude: 23.8342,
  },

  /**
   * ⚠️ CONFIRM: opening hours must match Google Business Profile exactly.
   * Mismatches suppress the hours panel in search results.
   */
  openingHours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],

  priceRange: "€€",
  foundingDate: "2026", // ⚠️ CONFIRM
  currency: "EUR",

  /**
   * ⚠️ REPLACE with real profile URLs before launch.
   * `sameAs` is how Google links your site to your social and directory
   * profiles — this is what consolidates entity authority. Bare domains
   * (e.g. "https://facebook.com") are worse than omitting the field.
   * Remove any line you don't actually have a profile for.
   */
  sameAs: [
    // "https://www.facebook.com/froshfi",
    // "https://www.instagram.com/froshfi",
    // "https://www.linkedin.com/company/frosh",
    // "https://www.google.com/maps/place/?q=place_id:XXXXXXXX",
  ] as string[],
} as const;

// ── Service area ──────────────────────────────────────────────────────────────

/**
 * Cities served today. Per Section 3.4 of the Terms: Tampere and Pirkanmaa.
 * Adding a city here surfaces it in LocalBusiness `areaServed` and Service
 * schema. Creating a dedicated /siivous-{city} landing page is a separate
 * step — see the Local SEO notes.
 */
export const SERVICE_AREA = {
  primaryCity: "Tampere",
  region: "Pirkanmaa",
  country: "Finland",
  /** ⚠️ CONFIRM the real coverage radius in metres. */
  radiusMeters: 30000,
  cities: ["Tampere", "Nokia", "Ylöjärvi", "Kangasala", "Pirkkala", "Lempäälä"],
} as const;

// ── Services ──────────────────────────────────────────────────────────────────

export interface ServiceDefinition {
  /** Matches `services.slug` in Supabase and `serviceType` in the booking flow. */
  slug: string;
  /** Public route segment, without locale prefix. */
  path: string;
  name: { en: string; fi: string };
  description: { en: string; fi: string };
  /** Schema.org service category. */
  category: string;
  /** Lowest advertised price incl. VAT. Null for quote-only services. */
  priceFrom: number | null;
  /** "Visit" for one-time, "Month" for subscription entry price. */
  priceUnit: "Visit" | "Month" | null;
}

export const SERVICES: ServiceDefinition[] = [
  {
    slug: "maintenance",
    path: "/services/home-care",
    name: {
      en: "Home Maintenance Cleaning",
      fi: "Kodin ylläpitosiivous",
    },
    description: {
      en: "Recurring home cleaning in Tampere on a weekly, bi-weekly, or monthly schedule. Same vetted cleaner where possible, all supplies included, eligible for the Finnish household tax deduction.",
      fi: "Säännöllinen kotisiivous Tampereella viikoittain, joka toinen viikko tai kuukausittain. Sama luotettava siivooja mahdollisuuksien mukaan, välineet sisältyvät hintaan, kotitalousvähennyskelpoinen.",
    },
    category: "House Cleaning",
    priceFrom: 87,
    priceUnit: "Month",
  },
  {
    slug: "deep",
    path: "/services/deep-cleaning",
    name: {
      en: "Deep Cleaning",
      fi: "Syväsiivous",
    },
    description: {
      en: "Thorough top-to-bottom deep clean covering the areas routine cleaning misses. Available monthly, quarterly, or as a one-time service across Tampere and Pirkanmaa.",
      fi: "Perusteellinen syväsiivous, joka kattaa alueet joita tavallinen siivous ei tavoita. Saatavilla kuukausittain, neljännesvuosittain tai kertaluonteisesti Tampereella ja Pirkanmaalla.",
    },
    category: "Deep Cleaning",
    priceFrom: 134,
    priceUnit: "Month",
  },
  {
    slug: "moveout",
    path: "/services/moveout",
    name: {
      en: "Move-Out Cleaning",
      fi: "Muuttosiivous",
    },
    description: {
      en: "End-of-tenancy cleaning in Tampere carried out to the standard Finnish landlords and housing companies expect at handover.",
      fi: "Muuttosiivous Tampereella suomalaisten vuokranantajien ja taloyhtiöiden luovutusvaatimusten mukaisesti.",
    },
    category: "Move Out Cleaning",
    priceFrom: 158,
    priceUnit: null,
  },
  {
    slug: "office",
    path: "/services/office",
    name: {
      en: "Office & Workplace Cleaning",
      fi: "Toimistosiivous",
    },
    description: {
      en: "Contract cleaning for offices and workplaces in Tampere, priced by weekly hours with a schedule built around your working day.",
      fi: "Sopimussiivous toimistoille ja työpaikoille Tampereella, hinnoiteltu viikkotuntien mukaan ja aikataulutettu työpäivänne ympärille.",
    },
    category: "Office Cleaning",
    priceFrom: null, // quote-based
    priceUnit: null,
  },
];

// ── Route registry ────────────────────────────────────────────────────────────

export type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface RouteDefinition {
  /** Path without locale prefix. "" is the homepage. */
  path: string;
  priority: number;
  changeFrequency: ChangeFreq;
  /** Excluded from the sitemap and given a noindex directive. */
  noindex?: boolean;
}

/**
 * PUBLIC routes only. Anything added here enters the sitemap and receives
 * canonical + hreflang tags automatically.
 */
export const PUBLIC_ROUTES: RouteDefinition[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  ...SERVICES.map((s) => ({
    path: s.path,
    priority: 0.9,
    changeFrequency: "monthly" as ChangeFreq,
  })),
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/booking", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

/**
 * Public but deliberately kept out of the index.
 *
 * Booking success and cancel URLs carry `session_id` and `booking_id` query
 * parameters. Every completed booking would otherwise generate a unique
 * indexable URL exposing a booking UUID — a privacy problem and a thin-content
 * problem at the same time.
 */
export const NOINDEX_ROUTES: string[] = [
  "/booking/success",
  "/booking/cancelled",
  "/pricing/office-cleaning/success",
  "/pricing/office-cleaning/cancelled",
];

/** Never crawled, never indexed. */
export const DISALLOWED_PATHS: string[] = [
  "/admin",
  "/dashboard",
  "/api",
  "/login",
  "/signup",
  "/reset-password",
  "/auth",
  "/booking/success",
  "/booking/cancelled",
  "/pricing/office-cleaning/success",
  "/pricing/office-cleaning/cancelled",
  "/*?session_id=",
  "/*?booking_id=",
];

// ── URL builders ──────────────────────────────────────────────────────────────

/** Absolute, locale-prefixed, trailing-slash-free URL. */
export function absoluteUrl(locale: Locale, path = ""): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return `${BASE_URL}/${locale}${clean}`;
}

/**
 * hreflang map for a path across every locale, plus x-default.
 *
 * x-default tells Google which version to serve when no language matches.
 * Without it, Google guesses — and often guesses wrong for Finnish users.
 */
export function alternateLanguages(path = ""): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of LOCALES) {
    map[HREFLANG_TAGS[locale]] = absoluteUrl(locale, path);
  }
  map["x-default"] = absoluteUrl(DEFAULT_LOCALE, path);
  return map;
}

export function findService(slugOrPath: string): ServiceDefinition | undefined {
  return SERVICES.find((s) => s.slug === slugOrPath || s.path === slugOrPath);
}
