import { Home, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#7c9885]/5 to-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 with Cleaning Theme */}
        <div className="relative mb-8">
          {/* Floating sparkles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Sparkles className="absolute top-0 left-1/4 w-6 h-6 text-[#7c9885] animate-pulse opacity-60" />
            <Sparkles className="absolute top-1/3 right-1/4 w-4 h-4 text-[#7c9885] animate-pulse opacity-40 animation-delay-300" />
            <Sparkles className="absolute bottom-1/3 left-1/3 w-5 h-5 text-[#7c9885] animate-pulse opacity-50 animation-delay-600" />
          </div>

          {/* 404 Number */}
          <h1 className="text-9xl md:text-[12rem] font-bold text-[#7c9885]/20 leading-none select-none">
            404
          </h1>

          {/* Overlay Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                This page got cleaned away
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Looks like this page is as spotless as it gets — because it
          doesn&apos;t exist! Let&apos;s get you back to a cleaner experience.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7c9885] text-white rounded-full font-semibold hover:bg-[#435247] transition-all shadow-md hover:shadow-lg group"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Back to Home
          </Link>

          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#7c9885] border-2 border-[#7c9885] rounded-full font-semibold hover:bg-[#7c9885]/10 transition-all group"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Browse Services
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Popular pages:</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/services/home-care"
              className="text-sm text-gray-600 hover:text-[#7c9885] transition-colors underline decoration-dotted"
            >
              Home Care
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/services/office"
              className="text-sm text-gray-600 hover:text-[#7c9885] transition-colors underline decoration-dotted"
            >
              Office Cleaning
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/pricing"
              className="text-sm text-gray-600 hover:text-[#7c9885] transition-colors underline decoration-dotted"
            >
              Pricing
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/contact"
              className="text-sm text-gray-600 hover:text-[#7c9885] transition-colors underline decoration-dotted"
            >
              Contact Us
            </Link>
          </div>
        </div>

        {/* Fun Cleaning Fact */}
        <div className="mt-12 p-6 bg-[#7c9885]/10 rounded-2xl border border-[#7c9885]/20">
          <p className="text-sm text-gray-700 italic">
            💡 <strong>Did you know?</strong> While you were looking for this
            page, we could have cleaned your kitchen!
          </p>
        </div>
      </div>
    </div>
  );
}
