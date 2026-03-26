/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale, useMessages } from "next-intl";

interface ChecklistSectionProps {
  sectionKey: string;
  defaultOpen?: boolean;
}

function ChecklistSection({
  sectionKey,
  defaultOpen = false,
}: ChecklistSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const t = useTranslations(`services.checklist.${sectionKey}`);
  const locale = useLocale();
  const isFinnish = locale === "fi";
  const messages = useMessages();

  const sectionMessages = (messages as any)?.services?.checklist?.[sectionKey];
  const taskCount = Array.isArray(sectionMessages?.tasks)
    ? sectionMessages.tasks.length
    : 0;

  const tasks = Array.from({ length: taskCount }, (_, i) => t(`tasks.${i}`));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors"
      >
        <h3
          className={`${isFinnish ? "text-lg" : "text-xl"} font-semibold text-gray-900`}
        >
          {t("title")}
        </h3>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 bg-white">
          <ul className="grid md:grid-cols-2 gap-3">
            {tasks.map((task, idx) => (
              <li
                key={idx}
                className={`flex items-start text-gray-700 ${isFinnish ? "text-sm" : "text-base"}`}
              >
                <span className="text-[#7c9885] mr-2 mt-0.5">✓</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ServiceChecklist() {
  const t = useTranslations("services.checklist");
  const locale = useLocale();
  const isFinnish = locale === "fi";

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className={`${isFinnish ? "text-3xl" : "text-4xl"} font-bold text-gray-900 mb-4`}
          >
            {t("headline")}
          </h2>
          <p className={`${isFinnish ? "text-lg" : "text-xl"} text-gray-600`}>
            {t("description")}
          </p>
        </div>

        <div className="space-y-4">
          <ChecklistSection sectionKey="general" defaultOpen={true} />
          <ChecklistSection sectionKey="kitchen" />
          <ChecklistSection sectionKey="bathroom" />
          <ChecklistSection sectionKey="bedroom" />
          <ChecklistSection sectionKey="extras" />
        </div>

        <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <h4
            className={`${isFinnish ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-2`}
          >
            {t("notIncluded.title")}
          </h4>
          <p className={`text-gray-700 ${isFinnish ? "text-xs" : "text-sm"}`}>
            {t("notIncluded.description")}
          </p>
        </div>
      </div>
    </section>
  );
}
