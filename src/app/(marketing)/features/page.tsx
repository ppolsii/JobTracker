import type { Metadata } from "next";

import { ROUTES } from "@/config/routes";
import { FeatureHighlightsSection } from "@/features/marketing/components/FeatureHighlightsSection";
import { FEATURE_HIGHLIGHTS } from "@/features/marketing/constants/marketing.constants";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";

const TITLE = "Features";
const DESCRIPTION =
  "Every feature JobTracker Insights ships, from application tracking to smart notifications.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl(ROUTES.FEATURES) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonicalUrl(ROUTES.FEATURES),
    type: "website",
  },
};

// "FEATURES": explains all 11 features this task lists - the same
// FeatureHighlightsSection the Home page uses for its own lighter subset,
// just given the complete list here.
export default function FeaturesPage() {
  return (
    <FeatureHighlightsSection
      heading="Built for how a real job search actually works"
      description="Application Tracking and Companies are free forever. Pro adds Smart Job Import, Advanced Analytics, Calendar, Goals, Achievements, and Notifications."
      features={FEATURE_HIGHLIGHTS}
    />
  );
}
