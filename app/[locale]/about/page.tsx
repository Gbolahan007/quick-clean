import { BadgeCheck, CalendarClock, MapPin, Shield } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.hero" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

// ── Section: Hero ─────────────────────────────────────────────────────────────

function HeroSection() {
  const t = useTranslations("about.hero");

  return (
    <section className="relative pt-28 pb-16 px-5 overflow-hidden">
      {/* Soft background accent */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,152,133,0.08) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-3xl text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-[#7c9885]/20 bg-[#7c9885]/6">
          <MapPin
            size={11}
            strokeWidth={2}
            className="text-[#7c9885]"
            aria-hidden
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885]">
            Tampere, Finland
          </span>
        </div>

        <h1 className="text-[38px] sm:text-[52px] font-extrabold text-[#0a1628] tracking-tight leading-[1.08] mb-5">
          {t("title")}
        </h1>

        <p className="text-[17px] text-[#0a1628]/50 leading-relaxed max-w-xl mx-auto mb-8">
          {t("subtitle")}
        </p>

        <Link
          href="../pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0a1628] text-white text-[14px] font-semibold hover:bg-[#0a1628]/85 transition-colors duration-200"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}

// ── Section: Story ────────────────────────────────────────────────────────────

function StorySection() {
  const t = useTranslations("about.story");
  const paragraphs = t.raw("paragraphs") as string[];

  return (
    <section className="py-16 px-5">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-20">
          {/* Left: sticky eyebrow */}
          <div className="lg:pt-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885]">
              {t("eyebrow")}
            </span>
            {/* Decorative rule */}
            <div
              className="mt-3 w-8 h-0.5 rounded-full bg-[#7c9885]/40"
              aria-hidden
            />
          </div>

          {/* Right: paragraphs */}
          <div className="space-y-5">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                className={`leading-[1.85] ${
                  idx === 0
                    ? "text-[17px] text-[#0a1628]/80 font-medium"
                    : "text-[15px] text-[#0a1628]/60"
                }`}
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Principles ───────────────────────────────────────────────────────

function PrinciplesSection() {
  const t = useTranslations("about.principles");
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <section className="py-16 px-5 bg-white">
      <div className="mx-auto max-w-5xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885] block mb-10">
          {t("eyebrow")}
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-100 rounded-2xl overflow-hidden">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-8 hover:bg-[#f8faf9] transition-colors duration-200"
            >
              {/* Number */}
              <span className="text-[11px] font-bold text-[#7c9885]/50 mb-4 block">
                0{idx + 1}
              </span>

              <h3 className="text-[15px] font-bold text-[#0a1628] leading-snug mb-3">
                {item.title}
              </h3>

              <p className="text-[13px] text-[#0a1628]/55 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Founder ──────────────────────────────────────────────────────────

function FounderSection() {
  const t = useTranslations("about.founder");

  return (
    <section className="py-20 px-5">
      <div className="mx-auto max-w-5xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885] block mb-10">
          {t("eyebrow")}
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 lg:gap-20 items-start">
          {/* Photo column */}
          <div className="flex flex-col items-start gap-4">
            {/* Photo placeholder — swap src when image is ready */}
            <div className="w-full aspect-4/5 rounded-2xl bg-[#f0f5f2] border border-[#d4e8d9] overflow-hidden relative">
              {/* Uncomment and replace with actual image path when available:
              <Image
                src="/images/founder-jubril.jpg"
                alt={t("imageAlt")}
                fill
                className="object-cover object-center"
                priority
              />
              */}
              {/* Placeholder state */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-16 h-16 rounded-full bg-[#7c9885]/15 flex items-center justify-center">
                  <span className="text-2xl" aria-hidden>
                    👤
                  </span>
                </div>
                <span className="text-[11px] text-[#7c9885]/60 font-medium">
                  Photo coming soon
                </span>
              </div>
            </div>

            {/* Name + role */}
            <div>
              <p className="text-[15px] font-bold text-[#0a1628]">
                {t("name")}
              </p>
              <p className="text-[12px] text-[#0a1628]/45 mt-0.5">
                {t("role")}
              </p>
            </div>
          </div>

          {/* Bio column */}
          <div className="space-y-5 lg:pt-1">
            <p className="text-[16px] text-[#0a1628]/75 leading-[1.85]">
              {t("bio")}
            </p>

            {/* Mission statement — visually elevated */}
            <blockquote className="border-l-2 border-[#7c9885]/40 pl-5 py-1">
              <p className="text-[15px] text-[#0a1628]/65 leading-[1.85] italic">
                {t("mission")}
              </p>
            </blockquote>

            {/* Contact line */}
            <p className="text-[13px] text-[#0a1628]/45 pt-2">
              {t("contact")}{" "}
              <a
                href={`mailto:${t("email")}`}
                className="text-[#7c9885] font-medium underline underline-offset-2 decoration-[#7c9885]/30 hover:decoration-[#7c9885]/70 transition-all duration-200"
              >
                {t("email")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Made in Tampere ──────────────────────────────────────────────────

function TampereSection() {
  const t = useTranslations("about.tampere");

  return (
    <section className="py-16 px-5 bg-[#0a1628]">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-20">
          <div className="lg:pt-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c9885]">
              {t("eyebrow")}
            </span>
            <div
              className="mt-3 w-8 h-0.5 rounded-full bg-[#7c9885]/40"
              aria-hidden
            />
          </div>

          <p className="text-[16px] text-white/60 leading-[1.85]">
            {t("body")}
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Section: CTA ──────────────────────────────────────────────────────────────

function CTASection() {
  const t = useTranslations("about.cta");

  return (
    <section className="py-20 px-5">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[22px] sm:text-[28px] font-bold text-[#0a1628] tracking-tight leading-snug mb-8">
          {t("title")}
        </p>
        <Link
          href="../pricing"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7c9885] text-white text-[14px] font-semibold shadow-md shadow-[#7c9885]/30 hover:bg-[#6f8c78] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          {t("button")}
        </Link>
      </div>
    </section>
  );
}

// ── Trust strip ───────────────────────────────────────────────────────────────

function TrustStrip() {
  const t = useTranslations("about.trust");

  const items = [
    { icon: <Shield size={13} strokeWidth={1.8} />, key: "secure" },
    { icon: <BadgeCheck size={13} strokeWidth={1.8} />, key: "verified" },
    { icon: <CalendarClock size={13} strokeWidth={1.8} />, key: "flexible" },
  ] as const;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-8 border-t border-gray-100">
      {items.map(({ icon, key }, idx) => (
        <div key={key} className="flex items-center gap-2">
          {idx > 0 && (
            <span
              className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 -ml-4 mr-2"
              aria-hidden
            />
          )}
          <span className="text-[#7c9885]" aria-hidden>
            {icon}
          </span>
          <span className="text-[11.5px] font-medium text-[#0a1628]/50 tracking-wide">
            {t(key)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main className="bg-[#f8faf9]">
      <HeroSection />

      <div className="bg-[#f8faf9]">
        <StorySection />
      </div>

      <PrinciplesSection />

      <div className="bg-[#f8faf9]">
        <FounderSection />
      </div>

      <TampereSection />

      <div className="bg-[#f8faf9]">
        <CTASection />
        <TrustStrip />
      </div>
    </main>
  );
}
