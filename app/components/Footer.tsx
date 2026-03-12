"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-[#f8f9fa] text-black border-t border-gray-200 tracking-widest">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Top CTA Section */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 pb-8 border-b border-gray-200">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 md:mb-0 text-black">
            {t("footer.ctaHeadline")}
          </h2>
          <Link href="/quote" className="group relative">
            <div className="w-40 h-40 rounded-full bg-emerald-600 flex items-center justify-center hover:bg-emerald-700 transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="text-center text-white">
                <p className="text-sm font-medium mb-1">
                  {t("footer.ctaLine1")}
                </p>
                <p className="text-sm font-medium">{t("footer.ctaLine2")}</p>
                <div className="mt-2">
                  <svg
                    className="w-8 h-8 mx-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-black">Quick</span>
                <span className="text-emerald-600">Clean</span>
              </h3>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("footer.tagline")}
            </p>

            {/* Social Media Icons */}
            <div className="flex space-x-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/358503484537"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-black">
              {t("footer.linksHeading")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.services")}
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("footer.contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Our Services */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-black">
              {t("footer.servicesHeading")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/services#residential"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("landing.servicesOverview.services.regular")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services#commercial"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("landing.servicesOverview.services.office")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services#specialized"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("landing.servicesOverview.services.special")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("footer.allServices")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Get In Touch */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-black">
              {t("footer.contactHeading")}
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="tel:+358503484537"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-start group"
                >
                  <Phone className="w-5 h-5 mr-3 mt-1 shrink-0 group-hover:text-emerald-600" />
                  <span>+358 50 348 4537</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@quickclean.fi"
                  className="text-gray-600 hover:text-emerald-600 transition-colors flex items-start group"
                >
                  <Mail className="w-5 h-5 mr-3 mt-1 shrink-0 group-hover:text-emerald-600" />
                  <span>hello@quickclean.fi</span>
                </a>
              </li>
              <li>
                <div className="text-gray-600 flex items-start group">
                  <MapPin className="w-5 h-5 mr-3 mt-1 shrink-0 group-hover:text-emerald-600" />
                  <span>Tampere, Finland</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <p className="mb-4 md:mb-0">
              © {new Date().getFullYear()} QuickClean. {t("footer.rights")}
            </p>
            <div className="flex space-x-6">
              <Link
                href="/privacy"
                className="hover:text-emerald-600 transition-colors"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                href="/terms"
                className="hover:text-emerald-600 transition-colors"
              >
                {t("footer.terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
