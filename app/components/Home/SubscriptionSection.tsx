"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/navigation";

export default function SubscriptionSection() {
  const t = useTranslations("landing.subscription");

  const plans = [
    {
      id: "weekly",
      title: t("plans.weekly.title"),
      description: t("plans.weekly.description"),
      popular: false,
    },
    {
      id: "biweekly",
      title: t("plans.biweekly.title"),
      description: t("plans.biweekly.description"),
      popular: true,
    },
    {
      id: "monthly",
      title: t("plans.monthly.title"),
      description: t("plans.monthly.description"),
      popular: false,
    },
  ];

  const benefits = [
    t("benefits.0"),
    t("benefits.1"),
    t("benefits.2"),
    t("benefits.3"),
  ];

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4">
            {t("headline")}
          </h2>
          <p className="text-xl text-gray-700 mb-6 max-w-3xl mx-auto">
            {t("subheadline")}
          </p>
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-8 rounded-2xl border-2 transition-all hover:shadow-xl ${
                plan.popular
                  ? "border-[#e07a5f] shadow-lg"
                  : "border-gray-200 hover:border-[#e07a5f]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#e07a5f] text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-black mb-3">
                  {plan.title}
                </h3>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <Link
                href="/pricing"
                className={`block w-full py-3 px-6 rounded-full font-semibold text-center transition-all ${
                  plan.popular
                    ? "bg-[#e07a5f] text-white hover:bg-[#c96a4f]"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                View Details
              </Link>
            </div>
          ))}
        </div>

        {/* Key Benefits */}
        {/* <div className="bg-gray-50 rounded-2xl p-6 lg:p-10">
          <h3 className="text-2xl font-bold text-black mb-8 text-center">
            Key Benefits
          </h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-6 w-6 text-[#e07a5f]" />
                </div>
                <p className="text-lg text-black">{benefit}</p>
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </section>
  );
}
