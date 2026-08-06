import type { MetadataRoute } from "next";
import {
  BASE_URL,
  DISALLOWED_PATHS,
  IS_INDEXABLE_ENV,
} from "@/app/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE_ENV) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },

      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },

      {
        userAgent: ["GPTBot", "ChatGPT-User", "OAI-SearchBot"],
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ["ClaudeBot", "Claude-User", "anthropic-ai"],
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ["PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },

      {
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot"],
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
