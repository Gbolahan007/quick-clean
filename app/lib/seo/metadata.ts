import type { Metadata } from "next";
import {
  BASE_URL,
  BUSINESS,
  LOCALE_TAGS,
  LOCALES,
  IS_INDEXABLE_ENV,
  absoluteUrl,
  alternateLanguages,
  type Locale,
} from "./config";

const OG_IMAGE_PATH = "/og/default.png"; // 1200×630 — see notes
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export interface BuildMetadataInput {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  type?: "website" | "article";
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const {
    locale,
    path = "",
    title,
    description,
    image,
    imageAlt,
    noindex = false,
    type = "website",
    keywords,
    publishedTime,
    modifiedTime,
  } = input;

  const url = absoluteUrl(locale, path);
  const fullTitle = `${title} | ${BUSINESS.tradeName}`;

  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${BASE_URL}${image}`
    : `${BASE_URL}${OG_IMAGE_PATH}`;

  const shouldIndex = IS_INDEXABLE_ENV && !noindex;

  return {
    metadataBase: new URL(BASE_URL),
    title: fullTitle,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),

    alternates: {
      canonical: url,
      languages: alternateLanguages(path),
    },

    openGraph: {
      type,
      title: fullTitle,
      description,
      url,
      siteName: BUSINESS.tradeName,
      locale: LOCALE_TAGS[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => LOCALE_TAGS[l],
      ),
      images: [
        {
          url: imageUrl,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: imageAlt ?? title,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },

    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },

    robots: shouldIndex
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false },
        },

    other: {
      "geo.region": "FI-11",
      "geo.placename": BUSINESS.address.locality,
      "geo.position": `${BUSINESS.geo.latitude};${BUSINESS.geo.longitude}`,
      ICBM: `${BUSINESS.geo.latitude}, ${BUSINESS.geo.longitude}`,
    },
  };
}

export function buildRootMetadata(locale: Locale): Metadata {
  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: `${BUSINESS.tradeName} — Cleaning Services in Tampere`,
      template: `%s | ${BUSINESS.tradeName}`,
    },
    description:
      "Professional home and office cleaning in Tampere and Pirkanmaa. Vetted, insured cleaners, flexible subscriptions, and eligibility for the Finnish household tax deduction.",
    applicationName: BUSINESS.tradeName,
    authors: [{ name: BUSINESS.legalName, url: BASE_URL }],
    creator: BUSINESS.legalName,
    publisher: BUSINESS.legalName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: absoluteUrl(locale),
      languages: alternateLanguages(),
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? {
          verification: {
            ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
              ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
              : {}),
            ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
              ? {
                  other: {
                    "msvalidate.01":
                      process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}
