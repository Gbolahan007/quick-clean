import FinalCtaSection from "../components/Home/FinalCtaSection";
import HeroSection from "../components/Home/HeroSection";
import HowItWorksSection from "../components/Home/HowItWorksSection";
import ProblemSection from "../components/Home/ProblemSection";
import ServicesOverviewSection from "../components/Home/ServicesOverviewSection";
import SubscriptionSection from "../components/Home/SubscriptionSection";
// import TestimonialsSection from "../components/Home/TestimonialsSection";
// import TransformationSection from "../components/Home/TransformationSection";
import TrustSection from "../components/Home/TrustSection";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      {/* <TransformationSection /> */}
      <HowItWorksSection />
      <SubscriptionSection />
      <TrustSection />
      <ServicesOverviewSection />
      {/* <TestimonialsSection /> */}
      <FinalCtaSection />
    </main>
  );
}
