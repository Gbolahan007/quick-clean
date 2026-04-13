"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 overflow-hidden relative py-14 ">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        .anim-card  { animation: fadeUp 0.6s ease both; }
        .anim-icon  { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
        .anim-text  { animation: fadeUp 0.5s ease 0.3s both; }
        .anim-btns  { animation: fadeUp 0.5s ease 0.45s both; }
      `}</style>

      {/* Card */}
      <div className="anim-card relative z-10 bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden mt-10">
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7c9885] via-[#a8c4b0] to-[#0a1628]" />

        <div className="p-10 sm:p-14">
          {/* Icon */}
          <div className="anim-icon w-20 h-20 rounded-2xl bg-[#7c9885]/10 flex items-center justify-center mx-auto mb-8">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle
                cx="20"
                cy="20"
                r="18"
                stroke="#7c9885"
                strokeWidth="2.5"
              />
              <path
                d="M20 12v10"
                stroke="#7c9885"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="20" cy="27" r="1.5" fill="#7c9885" />
            </svg>
          </div>

          {/* Text */}
          <div className="anim-text text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7c9885] mb-3">
              Something went wrong
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#0a1628] mb-4 leading-tight">
              We hit a small
              <br />
              snag.
            </h1>
            <div className="w-12 h-0.5 bg-[#7c9885]/40 mx-auto mb-6" />
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
              An unexpected error occurred. Don&apos;t worry — your data is
              safe. Try again or head back home.
            </p>
            {error.digest && (
              <p className="mt-4 text-xs text-gray-300 font-mono">
                ref: {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="anim-btns mt-10 flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 bg-[#0a1628] text-white font-bold py-4 rounded-full hover:bg-[#1a2f4a] transition-colors text-sm cursor-pointer"
            >
              Try again →
            </button>
            <Link
              href="/"
              className="flex-1 border-2 border-[#0a1628]/10 text-[#0a1628] font-bold py-4 rounded-full hover:border-[#7c9885] hover:text-[#7c9885] transition-colors text-sm text-center"
            >
              Back to home
            </Link>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="px-10 sm:px-14 py-5 bg-[#7c9885]/5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Need help?{" "}
            <Link
              href="/contact"
              className="text-[#7c9885] font-semibold hover:underline"
            >
              Contact support
            </Link>
          </span>
          <span className="text-xs text-gray-300 font-mono">500</span>
        </div>
      </div>
    </div>
  );
}
