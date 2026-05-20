import { Footer } from "./Footer";

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
