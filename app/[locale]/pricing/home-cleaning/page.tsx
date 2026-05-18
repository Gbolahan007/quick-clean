import { PricingPageClient } from "./PricingPageClient";

type Props = {
  params: { locale: "en" | "fi" };
};

export default function PricingPage({ params }: Props) {
  return <PricingPageClient localeProp={params.locale} />;
}
