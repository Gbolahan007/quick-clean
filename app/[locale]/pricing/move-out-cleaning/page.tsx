import { MoveOutPricingPageClient } from "./MoveOutPricingPageClient";

export default async function MoveOutPricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeProp = locale === "fi" ? "fi" : "en";
  return <MoveOutPricingPageClient localeProp={localeProp} />;
}
