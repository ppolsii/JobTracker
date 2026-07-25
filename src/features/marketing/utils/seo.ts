import { env } from "@/config/env";
import { siteConfig } from "@/config/site";

// Pure helpers backing the marketing site's SEO requirements ("Metadata,
// OpenGraph, Twitter Cards, Canonical URLs, JSON-LD Structured Data") - no
// I/O, no React. `robots.ts`/`sitemap.ts` and every marketing page's
// `metadata.alternates.canonical` all build on `buildCanonicalUrl` so the
// site's base URL (`env.appUrl`, already established by Phase 2/23 for
// absolute redirect links) is read from exactly one place.

export function buildCanonicalUrl(path: string): string {
  return new URL(path, env.appUrl).toString();
}

// https://schema.org/Organization - identifies the business itself, shown
// in search results' knowledge panel when applicable.
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    description: siteConfig.description,
    url: buildCanonicalUrl("/"),
  };
}

// https://schema.org/WebSite - identifies the site as a whole (distinct
// from the Organization that publishes it).
export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: buildCanonicalUrl("/"),
  };
}

// https://schema.org/FAQPage - built directly from the same FAQ_ITEMS the
// FAQ section itself renders, so the structured data can never drift from
// what a visitor actually sees on the page ("never fabricate").
export function buildFaqJsonLd(faqs: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
