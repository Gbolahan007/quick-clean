import type { Metadata } from "next";
import { TermsContent } from "./TermsContent";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const isFi = locale === "fi";

  return {
    title: isFi ? "Käyttöehdot | Frosh" : "Terms of Service | Frosh",
    description: isFi
      ? "Frosh Enterprises -siivouspalveluiden käyttöehdot. Varaukset, tilaukset, peruutukset ja kuluttajan oikeudet Suomen ja EU:n lain mukaan."
      : "Terms of Service for Frosh Enterprises cleaning services in Tampere, Finland. Bookings, subscriptions, cancellation, and your rights under Finnish and EU law.",
    alternates: {
      canonical: `https://frosh.fi/${locale}/terms`,
      languages: {
        en: "https://frosh.fi/en/terms",
        fi: "https://frosh.fi/fi/terms",
      },
    },
    openGraph: {
      title: isFi ? "Käyttöehdot | Frosh" : "Terms of Service | Frosh",
      url: `https://frosh.fi/${locale}/terms`,
      siteName: "Frosh",
      locale: isFi ? "fi_FI" : "en_US",
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function TermsPage() {
  return <TermsContent />;
}
