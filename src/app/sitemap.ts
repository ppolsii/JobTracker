import type { MetadataRoute } from "next";

import { ROUTES } from "@/config/routes";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";

// "SEO": sitemap.xml (Next.js file convention - rendered as /sitemap.xml
// automatically). Only public, unauthenticated pages - everything under
// (dashboard) requires a login and is excluded here the same way it's
// disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const marketingPages: { path: string; priority: number }[] = [
    { path: ROUTES.HOME, priority: 1 },
    { path: ROUTES.FEATURES, priority: 0.8 },
    { path: ROUTES.PLANS, priority: 0.8 },
    { path: ROUTES.ABOUT, priority: 0.6 },
    { path: ROUTES.CONTACT, priority: 0.6 },
    { path: ROUTES.PRIVACY, priority: 0.3 },
    { path: ROUTES.TERMS, priority: 0.3 },
    { path: ROUTES.LOGIN, priority: 0.5 },
    { path: ROUTES.REGISTER, priority: 0.7 },
  ];

  return marketingPages.map(({ path, priority }) => ({
    url: buildCanonicalUrl(path),
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  }));
}
