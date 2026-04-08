"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QuoteForm from "../QuoteForm";

interface Service {
  id: string;
  slug: string;
  icon: string;
  name_en: string;
  name_fi: string;
  headline_en: string;
  headline_fi: string;
  description_en: string;
  description_fi: string;
  base_price: number | null;
  image: string;
}

interface Task {
  id: string;
  category: string;
  task_description_en: string;
  task_description_fi: string;
  display_order: number;
}

interface Addon {
  id: string;
  name_en: string;
  name_fi: string;
  description_en: string;
  description_fi: string;
  price: number;
  duration_minutes: number | null;
}

interface Exclusion {
  id: string;
  exclusion_description_en: string;
  exclusion_description_fi: string;
  display_order: number;
}

interface Props {
  service: Service;
  tasks: Task[];
  addons: Addon[];
  exclusions: Exclusion[];
  locale: string;
}

function TaskAccordion({
  groupedTasks,
  isFinnish,
}: {
  groupedTasks: Record<string, Task[]>;
  isFinnish: boolean;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const categoryLabels: Record<string, { en: string; fi: string }> = {
    general: { en: "In general / all spaces", fi: "Yleisesti / kaikki tilat" },
    kitchen: { en: "Kitchen", fi: "Keittiö" },
    bathroom: { en: "Bathroom", fi: "Kylpyhuone" },
    bedroom: { en: "Bedroom", fi: "Makuuhuone" },
    halls: { en: "Halls", fi: "Käytävät" },
    meeting_rooms: { en: "Meeting Rooms", fi: "Neuvotteluhuoneet" },
    restrooms: { en: "Restrooms", fi: "WC-tilat" },
    office_rooms: { en: "Office Rooms", fi: "Toimistohuoneet" },
    floors: { en: "Floors", fi: "Lattiat" },
    interior: { en: "Interior", fi: "Sisätilat" },
    galley: { en: "Galley (Kitchen)", fi: "Kambüüsi (Keittiö)" },
    head: { en: "Head (Bathroom)", fi: "Head (Kylpyhuone)" },
    deck: { en: "Exterior & Deck", fi: "Ulkotilat & Kansi" },
    restocking: { en: "Restocking", fi: "Täydennys" },
  };

  return (
    <div className="max-w-3xl mx-auto divide-y divide-gray-200 border-t border-gray-200">
      {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
        const isOpen = openCategory === category;
        const label = categoryLabels[category]
          ? isFinnish
            ? categoryLabels[category].fi
            : categoryLabels[category].en
          : category.replace("_", " ");

        return (
          <div key={category}>
            <button
              onClick={() => setOpenCategory(isOpen ? null : category)}
              className="w-full flex items-center justify-between py-6 text-left group cursor-pointer"
            >
              <span className="text-lg font-semibold text-[#0a1628] group-hover:text-[#7c9885] transition-colors">
                {label}
              </span>
              <span className="text-[#0a1628] group-hover:text-[#7c9885] transition-colors text-xl">
                {isOpen ? "↓" : "→"}
              </span>
            </button>

            {isOpen && (
              <ul className="pb-6 space-y-3 pl-2">
                {categoryTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#7c9885] shrink-0" />
                    <span
                      className={`${isFinnish ? "text-sm" : "text-base"} text-gray-600 leading-relaxed`}
                    >
                      {isFinnish
                        ? task.task_description_fi
                        : task.task_description_en}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ServiceDetail({
  service,
  tasks,
  addons,
  exclusions,
  locale,
}: Props) {
  console.log(service.image);
  const isFinnish = locale === "fi";
  const description = isFinnish
    ? service.description_fi
    : service.description_en;

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative sm:min-h-[580px]  flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <Image
          src={service.image}
          alt={isFinnish ? service.name_fi : service.name_en}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />

        {/* Color Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center mt-20 py-7">
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-1.5 text-white/70 text-sm mb-10">
            <Link href="/" className="hover:text-white transition-colors">
              {isFinnish ? "Etusivu" : "Home"}
            </Link>
            <span>›</span>
            <Link
              href={`/${locale}/services`}
              className="hover:text-white transition-colors"
            >
              {isFinnish ? "Palvelut" : "Services"}
            </Link>
            <span>›</span>
            <span className="text-white">
              {isFinnish ? service.name_fi : service.name_en}
            </span>
          </nav>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {isFinnish ? service.name_fi : service.name_en}
          </h1>

          {/* Divider */}
          <div className="w-24 h-0.5 bg-white/50 mx-auto mb-8" />

          {/* Description */}
          <p className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            {description}
          </p>

          {/* Price */}
          {service.base_price ? (
            <p className="text-white/80 text-sm mb-8">
              {isFinnish ? "Alkaen " : "Starting from "}
              <span className="font-bold text-white text-lg">
                €{service.base_price}
              </span>
            </p>
          ) : (
            <p className="text-white/70 text-sm mb-8">
              {isFinnish ? "Hinta tarjouksen mukaan" : "Price based on quote"}
            </p>
          )}

          {/* CTA */}
          <Link
            href="/booking"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#7c9885] font-bold px-10 py-4 rounded-full hover:bg-white/90 transition-colors text-base shadow-md"
          >
            {isFinnish
              ? `Valitse ${service.name_fi}`
              : `Choose ${service.name_en}`}{" "}
            →
          </Link>
        </div>
      </section>

      {/* Tasks Accordion */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`${isFinnish ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-bold text-[#7c9885] text-center mb-16`}
          >
            {isFinnish ? "Mitä sisältyy" : "What's included"}
          </h2>
          <TaskAccordion groupedTasks={groupedTasks} isFinnish={isFinnish} />
        </div>
      </section>

      {/* Addons */}
      {addons.length > 0 && (
        <section className="py-20 bg-[#f9fafb]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              className={`${isFinnish ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-bold text-[#7c9885] text-center mb-16`}
            >
              {isFinnish ? "Lisäpalvelut" : "Optional Add-ons"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className={`${isFinnish ? "text-sm" : "text-base"} font-bold text-gray-800`}
                    >
                      {isFinnish ? addon.name_fi : addon.name_en}
                    </h3>
                    <span className="text-[#7c9885] font-bold text-lg">
                      €{addon.price}
                    </span>
                  </div>
                  <p
                    className={`${isFinnish ? "text-xs" : "text-sm"} text-gray-500`}
                  >
                    {isFinnish ? addon.description_fi : addon.description_en}
                  </p>
                  {addon.duration_minutes && (
                    <p className="text-xs text-gray-400 mt-2">
                      ~{addon.duration_minutes} min
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Exclusions */}
      {exclusions.length > 0 && (
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              className={`${isFinnish ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-bold text-gray-800 text-center mb-16`}
            >
              {isFinnish ? "Ei sisälly palveluun" : "Not included"}
            </h2>
            <ul className="max-w-3xl mx-auto space-y-4">
              {exclusions.map((exclusion) => (
                <li key={exclusion.id} className="flex items-start gap-3">
                  <span className="mt-1 text-red-400 text-lg leading-none">
                    ✕
                  </span>
                  <span
                    className={`${isFinnish ? "text-sm" : "text-base"} text-gray-600`}
                  >
                    {isFinnish
                      ? exclusion.exclusion_description_fi
                      : exclusion.exclusion_description_en}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="py-20 bg-[#7c9885]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <QuoteForm
            isFinnish={isFinnish}
            serviceName={isFinnish ? service.name_fi : service.name_en}
          />
        </div>
      </section>
    </div>
  );
}
