import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/projects/", "/u/", "/feedback"],
        disallow: ["/api/", "/login", "/me/", "/submit"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
