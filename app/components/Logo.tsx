"use client";

import { Link } from "@/navigation";
import { Home } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function Logo() {
  const t = useTranslations();
  const appName = t("common.appName");
  const [firstPart, lastPart] = appName.includes("Clean")
    ? appName.split("Clean")
    : [appName, ""];

  return (
    <Link href="/">
      <Image
        src="/logo.jpeg"
        alt="Frosh"
        width={120}
        height={40}
        priority
        className="h-10 w-auto"
      />
    </Link>
  );
}
