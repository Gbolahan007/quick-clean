// app/components/GlobalFooterWrapper.tsx
// Thin client wrapper so the global layout stays a Server Component.
// Hides the global Footer on all /pricing/* routes —
// those routes render their own PricingFooter via the pricing layout.
"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export function GlobalFooterWrapper() {
  const pathname = usePathname();

  // Suppress global footer on every pricing sub-route
  if (pathname.includes("/pricing")) return null;

  return <Footer />;
}
