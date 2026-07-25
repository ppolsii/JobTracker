import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { AuthService } from "@/features/auth/services/auth.service";
import { FaqSection } from "@/features/marketing/components/FaqSection";
import { FeatureHighlightsSection } from "@/features/marketing/components/FeatureHighlightsSection";
import { HeroSection } from "@/features/marketing/components/HeroSection";
import { JsonLd } from "@/features/marketing/components/JsonLd";
import { PricingPreviewSection } from "@/features/marketing/components/PricingPreviewSection";
import { TestimonialsSection } from "@/features/marketing/components/TestimonialsSection";
import {
  FAQ_ITEMS,
  FEATURE_HIGHLIGHTS,
} from "@/features/marketing/constants/marketing.constants";
import {
  buildCanonicalUrl,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from "@/features/marketing/utils/seo";

export const metadata: Metadata = {
  title: "Track Your Job Search Like a Pro",
  description: siteConfig.description,
  alternates: { canonical: buildCanonicalUrl(ROUTES.HOME) },
  openGraph: {
    title: `${siteConfig.name} - Track Your Job Search Like a Pro`,
    description: siteConfig.description,
    url: buildCanonicalUrl(ROUTES.HOME),
    type: "website",
  },
};

// A curated subset for the Home page's lighter "highlights" section - the
// full 11 (every one this task lists) are explained in depth on /features.
const HOME_FEATURE_HIGHLIGHTS = FEATURE_HIGHLIGHTS.filter((feature) =>
  [
    "application-tracking",
    "companies",
    "timeline",
    "advanced-analytics",
    "calendar",
    "goals",
  ].includes(feature.key)
);

// IMPLEMENTATION_ORDER_V2.md Phase 37 (Landing Page & Marketing Website).
// Replaces the previous "/" stub (a pure auth redirect - see git history)
// with a real marketing homepage; the one piece of that stub's behavior
// worth keeping - an already-signed-in visitor still lands on their
// Dashboard, not marketing chrome - is preserved below.
export default async function MarketingHomePage() {
  const user = await AuthService.getCurrentUser();
  if (user) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={buildWebsiteJsonLd()} />
      <JsonLd data={buildFaqJsonLd(FAQ_ITEMS)} />

      <HeroSection />
      <FeatureHighlightsSection
        heading="Everything your job search needs"
        description="From your first application to your accepted offer."
        features={HOME_FEATURE_HIGHLIGHTS}
      />
      <TestimonialsSection />
      <PricingPreviewSection />
      <FaqSection />
    </>
  );
}
