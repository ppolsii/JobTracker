import { describe, expect, it, vi } from "vitest";

import {
  buildCanonicalUrl,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from "@/features/marketing/utils/seo";

// seo.ts reads env.appUrl - env.ts eagerly validates
// NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY at import time
// (neither is set in this test environment), so it must stay mocked here,
// the same way every Repository-touching Service test file already mocks
// whatever pulls in `@/lib/supabase/server`.
vi.mock("@/config/env", () => ({
  env: { appUrl: "https://jobtrackerinsights.example.com" },
}));

describe("buildCanonicalUrl", () => {
  it("resolves a relative path against the site's base URL", () => {
    expect(buildCanonicalUrl("/features")).toMatch(/\/features$/);
  });

  it("resolves the root path to exactly the base URL with a trailing slash", () => {
    const url = buildCanonicalUrl("/");
    expect(url.endsWith("/")).toBe(true);
  });

  it("produces a valid, absolute URL", () => {
    expect(() => new URL(buildCanonicalUrl("/plans"))).not.toThrow();
  });
});

describe("buildOrganizationJsonLd", () => {
  it("returns a schema.org Organization object with the site's own name/description/url", () => {
    const jsonLd = buildOrganizationJsonLd();
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.name.length).toBeGreaterThan(0);
    expect(jsonLd.url).toBe(buildCanonicalUrl("/"));
  });
});

describe("buildWebsiteJsonLd", () => {
  it("returns a schema.org WebSite object", () => {
    const jsonLd = buildWebsiteJsonLd();
    expect(jsonLd["@type"]).toBe("WebSite");
    expect(jsonLd.url).toBe(buildCanonicalUrl("/"));
  });
});

describe("buildFaqJsonLd", () => {
  it("maps each FAQ item to a Question/Answer pair, in the same order", () => {
    const faqs = [
      { question: "Is it free?", answer: "Yes." },
      { question: "Can I cancel?", answer: "Yes, anytime." },
    ];

    const jsonLd = buildFaqJsonLd(faqs);

    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(2);
    expect(jsonLd.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: { "@type": "Answer", text: "Yes." },
    });
    expect(jsonLd.mainEntity[1].name).toBe("Can I cancel?");
  });

  it("returns an empty mainEntity for an empty FAQ list", () => {
    expect(buildFaqJsonLd([]).mainEntity).toEqual([]);
  });
});
