"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function ServicesShowcaseSection() {
  const t = useTranslations("landing.servicesOverview");

  const services = [
    {
      id: "regular",
      title: t("services.regular"),
      image: "/cleaning1.jpg",
      description: t("serviceDescriptions.regular"),
    },
    {
      id: "deep",
      title: t("services.deep"),
      image: "/cleaning5.jpeg",
      description: t("serviceDescriptions.deep"),
    },
    {
      id: "office",
      title: t("services.office"),
      image: "/cleaning8.jpg",
      description: t("serviceDescriptions.office"),
    },
    {
      id: "moveOut",
      title: t("services.moveOut"),
      image: "/cleaning10.jpg",
      description: t("serviceDescriptions.moveOut"),
    },
  ];

  return (
    <section className="py-20 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4">
            {t("headline")}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t("intro")}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((service) => (
            <Link
              key={service.id}
              href="/services"
              className="group relative h-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-200 text-sm mb-4">
                  {service.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("learnMore")}
                  </span>
                  <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:border-[#e07a5f] transition-all">
                    <ArrowUpRight className="w-5 h-5 text-white group-hover:text-[#e07a5f] transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">{t("notFound")}</p>
          <Link
            href="/services"
            className="inline-flex items-center px-8 py-4 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl group"
          >
            {t("viewAll")}
            <ArrowUpRight className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
