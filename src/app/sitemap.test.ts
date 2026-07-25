import { describe, expect, it, vi } from "vitest";

import sitemap from "@/app/sitemap";
import { ROUTES } from "@/config/routes";

// sitemap.ts (via buildCanonicalUrl) reads env.appUrl - see seo.test.ts's
// own note on why @/config/env must stay mocked in tests.
vi.mock("@/config/env", () => ({
  env: { appUrl: "https://jobtrackerinsights.example.com" },
}));

describe("sitemap", () => {
  it("includes every public marketing page", () => {
    const urls = sitemap().map((entry) => entry.url);

    for (const path of [
      ROUTES.HOME,
      ROUTES.FEATURES,
      ROUTES.PLANS,
      ROUTES.ABOUT,
      ROUTES.CONTACT,
      ROUTES.PRIVACY,
      ROUTES.TERMS,
    ]) {
      expect(urls.some((url) => url.endsWith(path === "/" ? "/" : path))).toBe(true);
    }
  });

  it("never includes an authenticated-only (dashboard) route", () => {
    const urls = sitemap().map((entry) => entry.url);

    for (const path of [
      "/dashboard",
      "/applications",
      "/companies",
      "/cv-versions",
      "/analytics",
      "/calendar",
      "/goals",
      "/notifications",
      "/settings",
      "/pricing",
    ]) {
      expect(urls.some((url) => url.endsWith(path))).toBe(false);
    }
  });

  it("gives the home page the highest priority", () => {
    const entries = sitemap();
    const home = entries.find((entry) => entry.url.endsWith("/"));
    const highestPriority = Math.max(...entries.map((entry) => entry.priority ?? 0));

    expect(home?.priority).toBe(highestPriority);
  });

  it("produces only valid, absolute URLs", () => {
    for (const entry of sitemap()) {
      expect(() => new URL(entry.url)).not.toThrow();
    }
  });
});
