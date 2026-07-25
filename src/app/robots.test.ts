import { describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";

// robots.ts reads env.appUrl for the sitemap URL - see seo.test.ts's own
// note on why @/config/env must stay mocked in tests.
vi.mock("@/config/env", () => ({
  env: { appUrl: "https://jobtrackerinsights.example.com" },
}));

describe("robots", () => {
  it("allows the root path", () => {
    const result = robots();
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("disallows every authenticated-only (dashboard) route", () => {
    const result = robots();
    const disallow = Array.isArray(result.rules)
      ? result.rules.flatMap((rule) => rule.disallow ?? [])
      : ([] as string[]).concat(result.rules.disallow ?? []);

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
      "/search",
      "/pricing",
    ]) {
      expect(disallow).toContain(path);
    }
  });

  it("points to a sitemap.xml URL", () => {
    const result = robots();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
