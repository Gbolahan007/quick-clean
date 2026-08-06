import type { MetadataRoute } from "next";
import {
  LOCALES,
  PUBLIC_ROUTES,
  HREFLANG_TAGS,
  DEFAULT_LOCALE,
  absoluteUrl,
} from "@/app/lib/seo/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    if (route.noindex) continue;

    for (const locale of LOCALES) {
      const languages: Record<string, string> = {};
      for (const alt of LOCALES) {
        languages[HREFLANG_TAGS[alt]] = absoluteUrl(alt, route.path);
      }
      languages["x-default"] = absoluteUrl(DEFAULT_LOCALE, route.path);

      entries.push({
        url: absoluteUrl(locale, route.path),
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
