/* eslint-disable @typescript-eslint/no-explicit-any */

import { locales } from "@/i18n";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { notFound } from "next/navigation";
import { GlobalFooterWrapper } from "../components/GlobalFooterWrapper";
import Header from "../components/Header";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

const monserrat = Montserrat({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://Frosh.com"),

  title: {
    default: "Frosh | Professional Home & Office Cleaning Services",
    template: "%s | Frosh",
  },

  description:
    "Frosh is a trusted cleaning company providing professional home and office cleaning services. Enjoy more time and less stress with our reliable weekly, bi-weekly, and monthly cleaning plans.",

  keywords: [
    "Frosh",
    "cleaning company",
    "home cleaning services",
    "office cleaning",
    "deep cleaning services",
    "professional cleaners",
    "house cleaning subscription",
    "cleaning services Tampere",
  ],

  authors: [{ name: "Frosh" }],
  creator: "Frosh",
  publisher: "Frosh",

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "Frosh | Reliable Home & Office Cleaning Services",
    description:
      "Enjoy a calm, clean home without the stress. Frosh provides professional and reliable cleaning services for homes and businesses.",
    url: "https://Frosh.com",
    siteName: "Frosh",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frosh Professional Cleaning Services",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Frosh | Professional Cleaning Services",
    description:
      "Book reliable home and office cleaning services with Frosh. Spend less time cleaning and more time living.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
  },

  category: "cleaning services",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className={`${monserrat.className} `}>
        <Header />
        {children}
        <GlobalFooterWrapper />
      </div>
    </NextIntlClientProvider>
  );
}
