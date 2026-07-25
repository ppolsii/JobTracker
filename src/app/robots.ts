import type { MetadataRoute } from "next";

import { env } from "@/config/env";

// "SEO": robots.txt (Next.js file convention - this default export is
// rendered as /robots.txt automatically). Every authenticated-only route
// (everything under (dashboard)) is disallowed - a search engine should
// never index a page that only ever shows a login redirect or someone
// else's data anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/applications",
        "/companies",
        "/cv-versions",
        "/analytics",
        "/calendar",
        "/goals",
        "/notifications",
        "/settings",
        "/search",
        "/pricing",
        "/api/",
      ],
    },
    sitemap: new URL("/sitemap.xml", env.appUrl).toString(),
  };
}
