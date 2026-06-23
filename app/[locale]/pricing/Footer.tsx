"use client";

import { Shield, BadgeCheck, RotateCcw, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TrustItem {
  icon: React.ReactNode;
  label: string;
  sub: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: <Shield size={15} strokeWidth={1.8} />,
    label: "Secure booking",
    sub: "256-bit SSL encryption",
  },
  {
    icon: <BadgeCheck size={15} strokeWidth={1.8} />,
    label: "Vetted & Insured",
    sub: "All cleaners background-checked",
  },
  {
    icon: <RotateCcw size={15} strokeWidth={1.8} />,
    label: "Free cancellation",
    sub: "Up to 48 hours before visit",
  },
];

const HIDDEN_ON_SEGMENTS = [
  "pricing/home-care",
  "pricing/office-cleaning",
  "pricing/moveout",
];

function Dot() {
  return (
    <span
      className="hidden sm:block w-1 h-1 rounded-full bg-[#7c9885]/30 shrink-0"
      aria-hidden
    />
  );
}

function TrustBadge({ item }: { item: TrustItem }) {
  return (
    <div className="group flex flex-col items-center gap-1.5 px-4 py-2 transition-all duration-300">
      <div
        className="
          flex items-center justify-center
          w-8 h-8 rounded-full
          border border-[#7c9885]/25 bg-[#7c9885]/8
          text-[#7c9885]
          transition-all duration-300
          group-hover:border-[#7c9885]/50 group-hover:bg-[#7c9885]/15 group-hover:scale-110
        "
      >
        {item.icon}
      </div>
      <div className="text-center">
        <p className="text-[11.5px] font-semibold tracking-wide text-[#0a1628]/80 leading-tight">
          {item.label}
        </p>
        <p className="text-[10px] text-[#0a1628]/40 mt-0.5 leading-tight">
          {item.sub}
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  const pathname = usePathname();

  // Hide on pricing sub-pages that have their own fixed CTA bar.
  // usePathname() returns the path without the origin, e.g. "/en/pricing/office-cleaning"
  const isHidden = HIDDEN_ON_SEGMENTS.some((segment) =>
    pathname.includes(segment),
  );

  if (isHidden) return null;

  return (
    <footer
      className="w-full border-t border-[#0a1628]/6 bg-white/80 backdrop-blur-sm"
      aria-label="Trust and security information"
    >
      <div className="mx-auto max-w-3xl px-5 py-3">
        {/* Trust strip */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0">
          {TRUST_ITEMS.map((item, idx) => (
            <div key={item.label} className="flex items-center">
              <TrustBadge item={item} />
              {idx < TRUST_ITEMS.length - 1 && <Dot />}
            </div>
          ))}
        </div>

        {/* Support line */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <MessageCircle
            size={11}
            strokeWidth={1.8}
            className="text-[#7c9885]/60"
            aria-hidden
          />
          <p className="text-[10.5px] text-[#0a1628]/38 tracking-wide">
            Need help?{" "}
            <Link
              href="https://wa.me/358401234567"
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-[#7c9885] font-medium
                underline underline-offset-2 decoration-[#7c9885]/30
                hover:decoration-[#7c9885]/70
                transition-all duration-200
              "
            >
              Chat with us on WhatsApp
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
