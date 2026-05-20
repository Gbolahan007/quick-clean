// app/[locale]/office-cleaning/page.tsx
import { OfficeBookingPageClient } from "./OfficeBookingPageClient";

export default async function OfficeBookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <OfficeBookingPageClient localeProp={locale === "fi" ? "fi" : "en"} />;
}
