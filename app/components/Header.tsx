"use client";

import { Link, usePathname, useRouter } from "@/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { HeaderProvider, useHeader } from "./contexts/HeaderContext";
import Logo from "./Logo";

// ─── Scroll-aware hook ────────────────────────────────────────────────────────
function useScrollDirection() {
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const THRESHOLD = 8; // px of scroll needed before we react (prevents jitter)

    function onScroll() {
      const current = window.scrollY;
      setAtTop(current < 10);

      if (Math.abs(current - lastScrollY.current) < THRESHOLD) return;

      setVisible(current < lastScrollY.current); // true = scrolling up
      lastScrollY.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { visible, atTop };
}

// ─── Nav Dropdown (hover, desktop) ───────────────────────────────────────────
function Dropdown({
  label,
  isOpen,
  onOpen,
  onClose,
  children,
}: {
  label: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        onClick={onOpen}
        className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 font-medium transition-colors py-2"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full pt-2 w-48">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Language Dropdown (click, desktop) ──────────────────────────────────────
function LanguageDropdown({
  locale,
  isOpen,
  onToggle,
  onClose,
  onSwitch,
}: {
  locale: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSwitch: (lang: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-1.5 text-gray-700 hover:text-emerald-600 font-medium transition-colors py-2"
      >
        <span className={`fi ${locale === "en" ? "fi-gb" : "fi-fi"}`} />
        <span className="text-sm font-medium">{locale.toUpperCase()}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full pt-2 w-40">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2">
            {[
              { code: "en", flag: "fi-gb", label: "English" },
              { code: "fi", flag: "fi-fi", label: "Suomi" },
            ].map(({ code, flag, label }) => (
              <button
                key={code}
                onClick={() => onSwitch(code)}
                className={`flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors ${
                  locale === code
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-600"
                }`}
              >
                <span className={`fi ${flag}`} />
                <span className="font-medium">{label}</span>
                {locale === code && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Language Pill (tap, mobile) ─────────────────────────────────────────────
function MobileLanguagePill({
  locale,
  onSwitch,
}: {
  locale: string;
  onSwitch: (lang: string) => void;
}) {
  return (
    <div className="pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Language
      </p>
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { code: "en", flag: "fi-gb", label: "EN" },
          { code: "fi", flag: "fi-fi", label: "FI" },
        ].map(({ code, flag, label }) => (
          <button
            key={code}
            onClick={() => onSwitch(code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              locale === code
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className={`fi ${flag}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function HeaderContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn] = useState(false);
  const { visible, atTop } = useScrollDirection();

  const {
    mobileMenuOpen,
    companyDropdownOpen,
    servicesDropdownOpen,
    languageDropdownOpen,
    setCompanyDropdownOpen,
    setServicesDropdownOpen,
    setLanguageDropdownOpen,
    toggleMobileMenu,
    closeMobileMenu,
  } = useHeader();

  const switchLocale = (lang: string) => {
    if (lang !== locale) router.replace(pathname, { locale: lang });
    setLanguageDropdownOpen(false);
  };

  const handleMobileClick = () => {
    closeMobileMenu();
    setCompanyDropdownOpen(false);
    setServicesDropdownOpen(false);
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 tracking-widest
        bg-white
        transition-[transform,box-shadow] duration-300 ease-in-out
        ${visible ? "translate-y-0" : "-translate-y-full"}
        ${atTop ? "shadow-none" : "shadow-sm"}
      `}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Logo />

          {/* Desktop Nav */}
          <div className="hidden lg:flex lg:items-center lg:space-x-8">
            <Dropdown
              label={t("nav.about")}
              isOpen={companyDropdownOpen}
              onOpen={() => setCompanyDropdownOpen(true)}
              onClose={() => setCompanyDropdownOpen(false)}
            >
              <Link
                href="/about"
                className="block px-4 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t("nav.about")}
              </Link>
              <Link
                href="/our-story"
                className="block px-4 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                Our Story
              </Link>
            </Dropdown>

            <Dropdown
              label={t("nav.services")}
              isOpen={servicesDropdownOpen}
              onOpen={() => setServicesDropdownOpen(true)}
              onClose={() => setServicesDropdownOpen(false)}
            >
              <Link
                href="/services/residential"
                className="block px-4 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t("services.maintenance.name")}
              </Link>
              <Link
                href="/services/corporate"
                className="block px-4 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t("services.deepClean.name")}
              </Link>
              <Link
                href="/services/specialized"
                className="block px-4 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t("services.extras.title")}
              </Link>
            </Dropdown>

            <Link
              href="/pricing"
              className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
            >
              {t("nav.quote")}
            </Link>
          </div>

          {/* Desktop Right */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-5 py-2.5 text-emerald-700 border border-emerald-200 rounded-full 
               hover:bg-emerald-50 hover:border-emerald-300 
               font-semibold transition-all duration-200"
                >
                  {t("nav.login")}
                </Link>

                <Link
                  href="/signup"
                  className="px-5 py-2.5 text-emerald-700  rounded-full 
               border border-emerald-600
              hover:bg-emerald-50 hover:border-emerald-300 
               shadow-sm hover:shadow-md
               font-semibold transition-all duration-200"
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}
            <Link
              href="/book"
              className="px-6 py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {t("nav.cta")}
            </Link>
            <LanguageDropdown
              locale={locale}
              isOpen={languageDropdownOpen}
              onToggle={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              onClose={() => setLanguageDropdownOpen(false)}
              onSwitch={switchLocale}
            />
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-4 border-t border-gray-100">
            <div>
              <button
                onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                className="flex items-center justify-between w-full py-2 text-gray-700 font-medium"
              >
                <span>{t("nav.about")}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${companyDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {companyDropdownOpen && (
                <div className="pl-4 space-y-2 mt-2">
                  <Link
                    href="/about"
                    className="block py-2 text-gray-600 hover:text-emerald-600"
                    onClick={handleMobileClick}
                  >
                    {t("nav.about")}
                  </Link>
                  <Link
                    href="/our-story"
                    className="block py-2 text-gray-600 hover:text-emerald-600"
                    onClick={handleMobileClick}
                  >
                    Our Story
                  </Link>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                className="flex items-center justify-between w-full py-2 text-gray-700 font-medium"
              >
                <span>{t("nav.services")}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {servicesDropdownOpen && (
                <div className="pl-4 space-y-2 mt-2">
                  <Link
                    href="/services/residential"
                    className="block py-2 text-gray-600 hover:text-emerald-600"
                    onClick={handleMobileClick}
                  >
                    {t("services.maintenance.name")}
                  </Link>
                  <Link
                    href="/services/corporate"
                    className="block py-2 text-gray-600 hover:text-emerald-600"
                    onClick={handleMobileClick}
                  >
                    {t("services.deepClean.name")}
                  </Link>
                  <Link
                    href="/services/specialized"
                    className="block py-2 text-gray-600 hover:text-emerald-600"
                    onClick={handleMobileClick}
                  >
                    {t("services.extras.title")}
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/pricing"
              className="block py-2 text-gray-700 font-medium hover:text-emerald-600"
              onClick={handleMobileClick}
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/contact"
              className="block py-2 text-gray-700 font-medium hover:text-emerald-600"
              onClick={handleMobileClick}
            >
              {t("nav.quote")}
            </Link>

            <MobileLanguagePill locale={locale} onSwitch={switchLocale} />

            <div className="space-y-2 pt-4 border-t border-gray-100">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="block w-full px-4 py-3 text-center bg-emerald-600 text-white rounded-lg font-semibold"
                  onClick={handleMobileClick}
                >
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full px-4 py-3 text-center border border-emerald-600 text-emerald-600 rounded-lg font-semibold"
                    onClick={handleMobileClick}
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full px-4 py-3 text-center bg-gray-100 text-gray-700 rounded-lg font-semibold"
                    onClick={handleMobileClick}
                  >
                    {t("nav.signup")}
                  </Link>
                </>
              )}
              <Link
                href="/book"
                className="block w-full px-4 py-3 text-center bg-emerald-600 text-white rounded-lg font-semibold shadow-md"
                onClick={handleMobileClick}
              >
                {t("nav.cta")}
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

export default function Header() {
  return (
    <HeaderProvider>
      <HeaderContent />
    </HeaderProvider>
  );
}
