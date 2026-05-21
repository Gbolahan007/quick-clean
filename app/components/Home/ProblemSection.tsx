import { useTranslations } from "next-intl";
import { Briefcase, Calendar, Brain } from "lucide-react";

export default function ProblemSection() {
  const t = useTranslations("landing");

  const painPoints = [
    {
      icon: Briefcase,
      title: t("problem.workdays.title"),
      subtitle: t("problem.workdays.subtitle"),
    },
    {
      icon: Calendar,
      title: t("problem.weekends.title"),
      subtitle: t("problem.weekends.subtitle"),
    },
    {
      icon: Brain,
      title: t("problem.mental.title"),
      subtitle: t("problem.mental.subtitle"),
    },
  ];

  return (
    <section className="py-20 bg-[#f7f6f3]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
            {t("problem.headline")}
          </h2>
        </div>

        {/* Three Column Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-4">
                  <Icon className="h-12 w-12 text-black" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">
                  {point.title}
                </h3>
                <p className="text-base text-black">{point.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Positive pivot — benefits.4 */}
        <div className="text-center mb-8">
          <p className="inline-block text-lg font-semibold text-black border-b-2 border-black pb-1">
            {t("transformation.benefits.4")}
          </p>
        </div>

        {/* Bottom Text */}
        <div className="text-center">
          <p className="text-lg text-black leading-relaxed max-w-3xl mx-auto">
            {t("problem.conclusion")}
          </p>
        </div>
      </div>
    </section>
  );
}
