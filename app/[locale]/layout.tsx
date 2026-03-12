/* eslint-disable @typescript-eslint/no-explicit-any */

import { locales } from "@/i18n";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import { notFound } from "next/navigation";
import Header from "../components/Header";
import "./globals.css";
import Footer from "../components/Footer";

const geistSans = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quickclean.com"),

  title: {
    default: "QuickClean | Professional Home & Office Cleaning Services",
    template: "%s | QuickClean",
  },

  description:
    "QuickClean is a trusted cleaning company providing professional home and office cleaning services. Enjoy more time and less stress with our reliable weekly, bi-weekly, and monthly cleaning plans.",

  keywords: [
    "QuickClean",
    "cleaning company",
    "home cleaning services",
    "office cleaning",
    "deep cleaning services",
    "professional cleaners",
    "house cleaning subscription",
    "cleaning services Tampere",
  ],

  authors: [{ name: "QuickClean" }],
  creator: "QuickClean",
  publisher: "QuickClean",

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "QuickClean | Reliable Home & Office Cleaning Services",
    description:
      "Enjoy a calm, clean home without the stress. QuickClean provides professional and reliable cleaning services for homes and businesses.",
    url: "https://quickclean.com",
    siteName: "QuickClean",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QuickClean Professional Cleaning Services",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "QuickClean | Professional Cleaning Services",
    description:
      "Book reliable home and office cleaning services with QuickClean. Spend less time cleaning and more time living.",
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
    <html lang={locale}>
      <body
        className={`${geistSans.className} ${geistMono.className} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <div className={`${bebasNeue.className} `}>
            <Header />
            {children}
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
