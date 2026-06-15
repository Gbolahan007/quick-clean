"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export function GlobalFooterWrapper() {
  const pathname = usePathname();

  if (pathname.includes("/pricing")) return null;
  if (pathname.includes("/booking")) return null;
  if (pathname.includes("/dashboard")) return null;

  return <Footer />;
}
