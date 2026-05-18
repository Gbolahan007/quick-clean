import { OfficePricingPageClient } from "./OfficePricingPageClient";

export default async function OfficePricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeProp = locale === "fi" ? "fi" : "en";
  return <OfficePricingPageClient localeProp={localeProp} />;
}
