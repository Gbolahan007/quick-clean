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
        {/* Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-black">Frosh</span>
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
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#7c9885] hover:bg-[#7c9885] hover:text-white transition-all"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#7c9885] hover:bg-[#7c9885] hover:text-white transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#7c9885] hover:bg-[#7c9885] hover:text-white transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/358503484537"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#7c9885] hover:bg-[#7c9885] hover:text-white transition-all"
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
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.services")}
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("nav.pricing")}
                </Link>
              </li>
              {/* <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("footer.contact")}
                </Link>
              </li> */}
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
                  href="/services/home-care"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("landing.servicesOverview.services.regular")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services/office"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("landing.servicesOverview.services.office")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services/moveout"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
                  {t("landing.servicesOverview.services.moveOut")}
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-[#7c9885] rounded-full mr-3 group-hover:bg-black transition-colors"></span>
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
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-start group"
                >
                  <Phone className="w-5 h-5 mr-3 mt-1 shrink-0 group-hover:text-[#7c9885]" />
                  <span>+358 50 348 4537</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@frosh.fi"
                  className="text-gray-600 hover:text-[#7c9885] transition-colors flex items-start group"
                >
                  <Mail className="w-5 h-5 mr-3 mt-1 shrink-0 group-hover:text-[#7c9885]" />
                  <span>hello@frosh.fi</span>
                </a>
              </li>
              <li>
                <div className="text-gray-600 flex items-start group">
                  <MapPin className="w-5 h-5 mr-3 mt-1 shrink-0 group-hover:text-[#7c9885]" />
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
              © {new Date().getFullYear()} Frosh. {t("footer.rights")}
            </p>
            <div className="flex space-x-6">
              <Link
                href="/privacy"
                className="hover:text-[#7c9885] transition-colors"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                href="/terms"
                className="hover:text-[#7c9885] transition-colors"
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
