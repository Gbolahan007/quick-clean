"use client";

import { Link } from "@/navigation";
import { Home } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Logo() {
  const t = useTranslations();
  const appName = t("common.appName");
  const [firstPart, lastPart] = appName.includes("Clean")
    ? appName.split("Clean")
    : [appName, ""];

  return (
    <Link href="/" className="flex items-center space-x-2 group">
      <div className="bg-[#7c9885] p-2 rounded-lg group-hover:bg-[#5f7465] transition-colors">
        <Home className="h-6 w-6 text-white" />
      </div>
      <span className="text-2xl font-bold text-gray-900">
        {firstPart}
        <span className="text-[#7c9885]">Clean</span>
        {lastPart}
      </span>
    </Link>
  );
}
