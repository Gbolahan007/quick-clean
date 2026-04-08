"use client";

import { useState } from "react";

const SIZE_OPTIONS = [
  { en: "Under 50m²", fi: "Alle 50m²", value: "under_50" },
  { en: "50 – 74m²", fi: "50 – 74m²", value: "50_74" },
  { en: "75 – 99m²", fi: "75 – 99m²", value: "75_99" },
  { en: "100 – 124m²", fi: "100 – 124m²", value: "100_124" },
  { en: "125 – 149m²", fi: "125 – 149m²", value: "125_149" },
  { en: "150m² +", fi: "150m² +", value: "over_150" },
];

const FREQUENCY_OPTIONS = [
  { en: "Every week", fi: "Joka viikko", value: "weekly" },
  { en: "Biweekly", fi: "Joka toinen viikko", value: "biweekly" },
  { en: "Once a month", fi: "Kerran kuussa", value: "monthly" },
  { en: "One time only", fi: "Kertaluonteinen", value: "once" },
];

interface Props {
  isFinnish: boolean;
  serviceName: string;
}

export default function QuoteForm({ isFinnish, serviceName }: Props) {
  const [size, setSize] = useState("");
  const [frequency, setFrequency] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-[#0a1628] uppercase tracking-tight mb-3">
          {isFinnish
            ? `Kuinka paljon ${serviceName} maksaa?`
            : `How much would ${serviceName} cost?`}
        </h2>
        <p className="text-gray-500 text-sm sm:text-base">
          {isFinnish
            ? "Pyydä tarjous ja saat vastauksen nopeasti."
            : "Request a quote and get a fast response."}
        </p>
      </div>

      <div className="space-y-8">
        {/* Size selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#0a1628] mb-3">
            {isFinnish ? "Valitse tilasi koko" : "Select your space size"}
          </label>
          <div className="relative">
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-xl px-5 py-4 text-[#0a1628] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#7c9885] cursor-pointer text-base"
            >
              <option value="" disabled>
                {isFinnish ? "Valitse koko..." : "Select size..."}
              </option>
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isFinnish ? opt.fi : opt.en}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#0a1628] text-lg">
              ▾
            </span>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#0a1628] mb-3">
            {isFinnish
              ? "Kuinka usein?"
              : "How often do you want the cleaning?"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={`py-4 px-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer text-center ${
                  frequency === opt.value
                    ? "border-[#7c9885] bg-[#7c9885]/10 text-[#7c9885]"
                    : "border-gray-200 text-[#0a1628] hover:border-[#7c9885]/50"
                }`}
              >
                {isFinnish ? opt.fi : opt.en}
              </button>
            ))}
          </div>
        </div>

        {/* VAT exempt */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setVatExempt(!vatExempt)}
            className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
              vatExempt
                ? "bg-[#7c9885] border-[#7c9885]"
                : "border-gray-300 bg-white"
            }`}
          >
            {vatExempt && (
              <span className="text-white text-xs font-bold">✓</span>
            )}
          </button>
          <span className="text-sm text-gray-600">
            {isFinnish ? (
              <>
                Olen oikeutettu{" "}
                <span className="underline cursor-pointer">
                  ALV-vapaisiin siivouspalveluihin
                </span>
              </>
            ) : (
              <>
                I am eligible for{" "}
                <span className="underline cursor-pointer">
                  VAT exempt cleaning services
                </span>
              </>
            )}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Contact details */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#0a1628] mb-3">
            {isFinnish ? "Yhteystietosi" : "Your contact details"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={isFinnish ? "Nimi" : "Full name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-200 rounded-xl px-5 py-4 text-[#0a1628] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885] text-sm"
            />
            <input
              type="email"
              placeholder={isFinnish ? "Sähköposti" : "Email address"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-200 rounded-xl px-5 py-4 text-[#0a1628] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885] text-sm"
            />
            <input
              type="tel"
              placeholder={isFinnish ? "Puhelinnumero" : "Phone number"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-gray-200 rounded-xl px-5 py-4 text-[#0a1628] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885] text-sm sm:col-span-2"
            />
            <textarea
              placeholder={
                isFinnish
                  ? "Lisätietoja (valinnainen)"
                  : "Additional details (optional)"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="border border-gray-200 rounded-xl px-5 py-4 text-[#0a1628] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c9885] text-sm sm:col-span-2 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          className="w-full bg-[#0a1628] text-white font-bold py-4 rounded-full hover:bg-[#1a2f4a] transition-colors text-base cursor-pointer"
        >
          {isFinnish ? "Lähetä tarjouspyyntö →" : "Request a quote →"}
        </button>
      </div>
    </div>
  );
}
