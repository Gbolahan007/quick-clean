import FinalCtaSection from "../components/Home/FinalCtaSection";
import HeroSection from "../components/Home/HeroSection";
import HowItWorksSection from "../components/Home/HowItWorksSection";
import ProblemSection from "../components/Home/ProblemSection";
import ServicesOverviewSection from "../components/Home/ServicesOverviewSection";
import SubscriptionSection from "../components/Home/SubscriptionSection";
import TestimonialsSection from "../components/Home/TestimonialsSection";
import TransformationSection from "../components/Home/TransformationSection";

export default function HomePage() {
  return (
    <main className="tracking-widest">
      <HeroSection />
      <ProblemSection />
      {/* <TransformationSection /> */}
      <HowItWorksSection />
      <SubscriptionSection />
      <ServicesOverviewSection />
      <TestimonialsSection />
      <FinalCtaSection />
    </main>
  );
}
