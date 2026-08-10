"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  AlertTriangle,
  Info,
  Scale,
  Mail,
  ChevronRight,
} from "lucide-react";
import { TERMS_SECTIONS, LAST_UPDATED, type Block } from "./termsData";

const SHOW_DRAFT_NOTICE = false;

function renderWithPlaceholders(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      return (
        <mark
          key={i}
          className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-medium not-italic"
          title="Placeholder — confirm before publishing"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function TermsContent() {
  const [activeId, setActiveId] = useState<string>(TERMS_SECTIONS[0].id);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // ── Scroll spy ────────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    const nodes = Array.from(sectionRefs.current.values());
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  // ── Back-to-top visibility ────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const registerSection = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) sectionRefs.current.set(id, node);
      else sectionRefs.current.delete(id);
    },
    [],
  );

  const scrollToSection = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
      setActiveId(id);
    },
    [],
  );

  const scrollToTop = useCallback(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  }, []);

  return (
    <div className="bg-white">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <header className="bg-[#f8f9fa] border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl py-8 sm:py-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#7c9885] mb-4">
              Legal
            </p>
            <h1 className="text-[32px] sm:text-[44px] font-extrabold text-[#0a1628] tracking-tight leading-[1.1]">
              Terms of Service
            </h1>
            <p className="text-[15px] sm:text-[17px] text-gray-500 mt-5 leading-relaxed">
              These terms explain how we work together — what we provide, what
              we ask of you, how bookings and subscriptions are handled, and the
              rights you have under Finnish and EU law. We&apos;ve kept them as
              plain as the law allows.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c9885]" />
                Last updated: {LAST_UPDATED}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f0f8f3] px-4 py-2 text-[12px] font-semibold text-[#3d6b47]">
                Governed by Finnish law
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Draft notice ───────────────────────────────────────────────── */}
      {SHOW_DRAFT_NOTICE && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <div
            role="note"
            className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 sm:px-6 sm:py-5 flex gap-4"
          >
            <AlertTriangle
              className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <p className="text-[14px] font-bold text-amber-900 m-0">
                Draft — not yet reviewed by a lawyer
              </p>
              <p className="text-[13px] text-amber-900/80 leading-relaxed m-0">
                This document was prepared in July 2026 from general EU and
                Finnish consumer-protection principles. It is not legal advice.
                Every{" "}
                <mark className="bg-amber-200 text-amber-900 px-1 rounded">
                  [bracketed]
                </mark>{" "}
                value marks an open business decision that must be confirmed,
                and the whole document requires review by a Finnish-qualified
                lawyer before publication.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-14">
          {/* ── Sticky table of contents (desktop) ──────────────────────── */}
          <nav aria-label="Table of contents" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                Contents
              </p>
              <ul className="space-y-0.5 border-l border-gray-200">
                {TERMS_SECTIONS.map((section) => {
                  const isActive = activeId === section.id;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={(e) => scrollToSection(e, section.id)}
                        aria-current={isActive ? "location" : undefined}
                        className={[
                          "group flex items-start gap-2 -ml-px border-l-2 pl-4 pr-2 py-2 text-[13px] leading-snug transition-colors rounded-r-lg",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885] focus-visible:ring-offset-1",
                          isActive
                            ? "border-[#7c9885] text-[#0a1628] font-semibold bg-[#f0f8f3]/60"
                            : "border-transparent text-gray-400 hover:text-[#0a1628] hover:border-gray-300",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "text-[11px] font-mono pt-px shrink-0 transition-colors",
                            isActive ? "text-[#7c9885]" : "text-gray-300",
                          ].join(" ")}
                        >
                          {String(section.number).padStart(2, "0")}
                        </span>
                        <span>{section.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* ── Mobile contents ─────────────────────────────────────────── */}
          <nav
            aria-label="Table of contents"
            className="lg:hidden mb-10 rounded-2xl border border-gray-200 bg-white overflow-hidden"
          >
            <details className="group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885] focus-visible:ring-inset">
                <span className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
                  Contents
                </span>
                <ChevronRight
                  className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <ul className="border-t border-gray-100 divide-y divide-gray-100">
                {TERMS_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => scrollToSection(e, section.id)}
                      className="flex items-center gap-3 px-5 py-3 text-[14px] text-gray-600 hover:bg-gray-50 hover:text-[#0a1628] transition-colors focus-visible:outline-none focus-visible:bg-gray-50"
                    >
                      <span className="text-[11px] font-mono text-gray-300 shrink-0">
                        {String(section.number).padStart(2, "0")}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </nav>

          {/* ── Sections ────────────────────────────────────────────────── */}
          <main className="min-w-0 max-w-[68ch]">
            <div className="space-y-6">
              {TERMS_SECTIONS.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={registerSection(section.id)}
                  aria-labelledby={`${section.id}-heading`}
                  className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white overflow-hidden focus:outline-none"
                >
                  <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f0f8f3] text-[12px] font-bold text-[#3d6b47] shrink-0">
                      {section.number}
                    </span>
                    <h2
                      id={`${section.id}-heading`}
                      className="text-[16px] sm:text-[17px] font-extrabold text-[#0a1628] tracking-tight m-0"
                    >
                      {section.title}
                    </h2>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {section.blocks.map((block, i) => (
                      <BlockRenderer key={i} block={block} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* ── Closing note ──────────────────────────────────────────── */}
            <div className="mt-10 rounded-2xl bg-[#f0f8f3] px-6 py-6">
              <p className="text-[14px] text-[#3d6b47] leading-relaxed m-0">
                Something here unclear? We&apos;d rather explain it than have
                you guess. Email us at{" "}
                <a
                  href="mailto:hello@frosh.fi"
                  className="font-semibold underline underline-offset-2 hover:text-[#0a1628] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885] rounded"
                >
                  hello@frosh.fi
                </a>
                .
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* ── Back to top ────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className={[
          "fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-[#0a1628] text-white",
          "flex items-center justify-center shadow-lg",
          "transition-all duration-300 hover:bg-[#3d6b47]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885] focus-visible:ring-offset-2",
          showBackToTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none",
        ].join(" ")}
      >
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-[14px] text-gray-600 leading-[1.75] m-0">
          {renderWithPlaceholders(block.content)}
        </p>
      );

    case "clause":
      return (
        <div className="flex gap-4">
          <span className="text-[12px] font-mono font-semibold text-[#7c9885] shrink-0 pt-1 w-8">
            {block.number}
          </span>
          <p className="text-[14px] text-gray-600 leading-[1.75] m-0">
            {renderWithPlaceholders(block.content)}
          </p>
        </div>
      );

    case "definition":
      return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <dt className="text-[13px] font-bold text-[#0a1628] mb-1">
            &ldquo;{block.term}&rdquo;
          </dt>
          <dd className="text-[13px] text-gray-600 leading-[1.7] m-0">
            {renderWithPlaceholders(block.content)}
          </dd>
        </div>
      );

    case "callout": {
      const styles = {
        info: {
          wrap: "border-[#b5cebe] bg-[#f0f8f3]",
          icon: "text-[#3d6b47]",
          title: "text-[#3d6b47]",
          body: "text-[#3d6b47]/80",
          Icon: Info,
        },
        warning: {
          wrap: "border-amber-300 bg-amber-50",
          icon: "text-amber-600",
          title: "text-amber-900",
          body: "text-amber-900/80",
          Icon: AlertTriangle,
        },
        legal: {
          wrap: "border-gray-200 bg-gray-50",
          icon: "text-gray-500",
          title: "text-[#0a1628]",
          body: "text-gray-600",
          Icon: Scale,
        },
      }[block.variant];

      const { Icon } = styles;

      return (
        <div
          role="note"
          className={`rounded-xl border px-4 py-3.5 flex gap-3 ${styles.wrap}`}
        >
          <Icon
            className={`w-4 h-4 shrink-0 mt-0.5 ${styles.icon}`}
            aria-hidden="true"
          />
          <div className="space-y-1">
            {block.title && (
              <p className={`text-[13px] font-bold m-0 ${styles.title}`}>
                {block.title}
              </p>
            )}
            <p className={`text-[13px] leading-[1.7] m-0 ${styles.body}`}>
              {renderWithPlaceholders(block.content)}
            </p>
          </div>
        </div>
      );
    }

    case "list":
      return block.ordered ? (
        <ol className="space-y-2 list-none counter-reset-item m-0 p-0">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-[14px] text-gray-600 leading-[1.7]"
            >
              <span className="text-[12px] font-mono font-semibold text-[#7c9885] shrink-0 pt-0.5">
                {i + 1}.
              </span>
              <span>{renderWithPlaceholders(item)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2 list-none m-0 p-0">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-[14px] text-gray-600 leading-[1.7]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#7c9885] shrink-0 mt-2"
                aria-hidden="true"
              />
              <span>{renderWithPlaceholders(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "contact":
      return (
        <dl className="space-y-3">
          {block.lines.map((line) => {
            const isEmail = line.value.includes("@");
            const isWeb = line.label === "Website";
            return (
              <div
                key={line.label}
                className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
              >
                <dt className="text-[12px] text-gray-400 sm:w-44 shrink-0">
                  {line.label}
                </dt>
                <dd className="text-[14px] font-medium text-[#0a1628] m-0">
                  {isEmail ? (
                    <a
                      href={`mailto:${line.value}`}
                      className="inline-flex items-center gap-1.5 text-[#3d6b47] hover:text-[#0a1628] underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885] rounded"
                    >
                      <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                      {line.value}
                    </a>
                  ) : isWeb ? (
                    <a
                      href="https://frosh.fi"
                      className="text-[#3d6b47] hover:text-[#0a1628] underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9885] rounded"
                    >
                      {line.value}
                    </a>
                  ) : (
                    renderWithPlaceholders(line.value)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      );

    default:
      return null;
  }
}
