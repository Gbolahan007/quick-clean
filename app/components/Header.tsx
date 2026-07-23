"use client";

import { Link, usePathname, useRouter } from "@/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { HeaderProvider, useHeader } from "./contexts/HeaderContext";
import Logo from "./Logo";
import { createClient } from "@/app/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

function useScrollDirection() {
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const THRESHOLD = 8;

    function onScroll() {
      const current = Math.max(0, window.scrollY);
      const isAtTop = current < 10;

      setAtTop(isAtTop);

      if (isAtTop) {
        setVisible(true);
        lastScrollY.current = current;
        return;
      }

      const delta = current - lastScrollY.current;
      if (Math.abs(delta) >= THRESHOLD) {
        setVisible(delta < 0);
        lastScrollY.current = current;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { visible, atTop };
}

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
        className="flex items-center space-x-1 text-gray-700 hover:text-[#7c9885] font-medium transition-colors py-2"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full pt-2 w-52">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

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
        className="flex items-center space-x-1.5 text-gray-700 hover:text-[#7c9885] font-medium transition-colors py-2"
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
                    ? "text-[#7c9885] bg-[#7c9885]/10"
                    : "text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885]"
                }`}
              >
                <span className={`fi ${flag}`} />
                <span className="font-medium">{label}</span>
                {locale === code && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7c9885]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
                ? "bg-white text-[#7c9885] shadow-sm"
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

function HeaderContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isFinnish = locale === "fi";

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check current session on mount
    supabase.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => {
        setIsLoggedIn(!!user);
      });

    // Keep in sync with login / logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setIsLoggedIn(!!session);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const { visible, atTop } = useScrollDirection();

  const {
    mobileMenuOpen,
    companyDropdownOpen,
    servicesDropdownOpen,
    pricingDropdownOpen,
    languageDropdownOpen,
    setCompanyDropdownOpen,
    setServicesDropdownOpen,
    setPricingDropdownOpen,
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
    setPricingDropdownOpen(false);
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-[transform,box-shadow] duration-300 ease-in-out
        ${visible ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <nav className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div
          className={`
            flex h-20 items-center justify-between whitespace-nowrap
            lg:rounded-2xl lg:mx-0 lg:shadow-none
            bg-white rounded-2xl mx-3 mt-3 px-4 shadow-md
            ${!atTop ? "lg:shadow-sm" : ""}
          `}
        >
          <Logo />

          {/* ── Desktop nav ──────────────────────────────────────────────── */}
          <div
            className={`hidden lg:flex lg:items-center ${isFinnish ? "lg:space-x-4" : "lg:space-x-8"}`}
          >
            <Dropdown
              label={t("nav.about")}
              isOpen={companyDropdownOpen}
              onOpen={() => setCompanyDropdownOpen(true)}
              onClose={() => setCompanyDropdownOpen(false)}
            >
              <Link
                href="/about"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("nav.about")}
              </Link>
              {/* <Link
                href="/our-story"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                Our Story
              </Link> */}
            </Dropdown>

            <Dropdown
              label={t("nav.services")}
              isOpen={servicesDropdownOpen}
              onOpen={() => setServicesDropdownOpen(true)}
              onClose={() => setServicesDropdownOpen(false)}
            >
              <Link
                href="/services/home-care"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("services.maintenance.name")}
              </Link>
              <Link
                href="/services/office-cleaning"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("services.deepClean.name")}
              </Link>
              <Link
                href="/services/deep-clean"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("services.extras.title")}
              </Link>
              <Link
                href="/services"
                className="block px-4 py-2 text-[#7c9885] font-semibold hover:bg-[#7c9885]/10 transition-colors"
              >
                {t("services.viewAll")}
              </Link>
            </Dropdown>

            <Dropdown
              label={t("nav.pricing")}
              isOpen={pricingDropdownOpen}
              onOpen={() => setPricingDropdownOpen(true)}
              onClose={() => setPricingDropdownOpen(false)}
            >
              <Link
                href="/pricing/home-care"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("services.cards.homeCare.title")}
              </Link>
              <Link
                href="/pricing/office-cleaning"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("services.cards.office.title")}
              </Link>
              <Link
                href="/pricing/moveout"
                className="block px-4 py-2 text-gray-700 hover:bg-[#7c9885]/10 hover:text-[#7c9885] transition-colors"
              >
                {t("services.cards.moveOut.title")}
              </Link>
            </Dropdown>
          </div>

          {/* ── Desktop right ─────────────────────────────────────────────── */}
          <div
            className={`hidden lg:flex lg:items-center ${isFinnish ? "lg:space-x-2" : "lg:space-x-4"}`}
          >
            {isLoggedIn ? (
              // Authenticated: show Dashboard link instead of Login/Signup
              <Link
                href="/dashboard"
                className={`${isFinnish ? "px-4 py-2 text-sm" : "px-5 py-2.5"} text-[#7c9885] border border-[#7c9885]/40 rounded-full
                  hover:bg-[#7c9885]/10 hover:border-[#7c9885]
                  font-semibold transition-all duration-200`}
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${isFinnish ? "px-4 py-2 text-sm" : "px-5 py-2.5"} text-[#7c9885] border border-[#7c9885]/40 rounded-full
                    hover:bg-[#7c9885]/10 hover:border-[#7c9885]
                    font-semibold transition-all duration-200`}
                >
                  {t("nav.login")}
                </Link>
                {/* <Link
                  href="/signup"
                  className={`${isFinnish ? "px-4 py-2 text-sm" : "px-5 py-2.5"} text-[#7c9885] rounded-full
                    border border-[#7c9885]
                    hover:bg-[#7c9885]/10 hover:border-[#435247]
                    shadow-sm hover:shadow-md
                    font-semibold transition-all duration-200`}
                >
                  {t("nav.signup")}
                </Link> */}
              </>
            )}
            <Link
              href="/pricing"
              className={`${isFinnish ? "px-5 py-2.5 text-sm" : "px-6 py-3"} bg-[#7c9885] text-white rounded-full hover:bg-[#435247] font-semibold shadow-md hover:shadow-lg transition-all`}
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

          {/* ── Mobile hamburger ─────────────────────────────────────────── */}
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

        {/* ── Mobile menu ──────────────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 px-3 mt-2 bg-white rounded-2xl shadow-md mx-3 space-y-4 border-t border-gray-100">
            {/* About */}
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
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("nav.about")}
                  </Link>
                  {/* <Link
                    href="/our-story"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    Our Story
                  </Link> */}
                </div>
              )}
            </div>

            {/* Services */}
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
                    href="/services/home-care"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("services.maintenance.name")}
                  </Link>
                  <Link
                    href="/services/office"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("services.extras.title")}
                  </Link>
                  <Link
                    href="/services/deep-clean"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("services.deepClean.name")}
                  </Link>
                  <Link
                    href="/services"
                    className="block py-2 text-[#7c9885] font-semibold hover:text-[#435247]"
                    onClick={handleMobileClick}
                  >
                    {t("services.viewAll")}
                  </Link>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div>
              <button
                onClick={() => setPricingDropdownOpen(!pricingDropdownOpen)}
                className="flex items-center justify-between w-full py-2 text-gray-700 font-medium"
              >
                <span>{t("nav.pricing")}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${pricingDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {pricingDropdownOpen && (
                <div className="pl-4 space-y-2 mt-2">
                  <Link
                    href="/pricing/home-care"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("services.cards.homeCare.title")}
                  </Link>
                  <Link
                    href="/pricing/office-cleaning"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("services.cards.office.title")}
                  </Link>
                  <Link
                    href="/pricing/moveout"
                    className="block py-2 text-gray-600 hover:text-[#7c9885]"
                    onClick={handleMobileClick}
                  >
                    {t("services.cards.moveOut.title")}
                  </Link>
                </div>
              )}
            </div>

            <MobileLanguagePill locale={locale} onSwitch={switchLocale} />

            {/* Auth / CTA buttons */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="block w-full px-4 py-3 text-center border border-[#7c9885] text-[#7c9885] rounded-lg font-semibold hover:bg-[#7c9885]/10 transition-all"
                  onClick={handleMobileClick}
                >
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full px-4 py-3 text-center border border-[#7c9885] text-[#7c9885] rounded-lg font-semibold hover:bg-[#7c9885]/10 transition-all"
                    onClick={handleMobileClick}
                  >
                    {t("nav.login")}
                  </Link>
                  {/* <Link
                    href="/signup"
                    className="block w-full px-4 py-3 text-center bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                    onClick={handleMobileClick}
                  >
                    {t("nav.signup")}
                  </Link> */}
                </>
              )}
              <Link
                href="/pricing"
                className="block w-full px-4 py-3 text-center bg-[#7c9885] text-white rounded-lg font-semibold shadow-md hover:bg-[#435247] transition-all"
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
