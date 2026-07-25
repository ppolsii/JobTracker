import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { PricingPlans } from "@/features/billing/components/PricingPlans";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";
import { Button } from "@/shared/components/ui/button";

const TITLE = "Pricing";
const DESCRIPTION =
  "Simple, transparent pricing - free forever, or upgrade to Pro for unlimited applications and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl(ROUTES.PLANS) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonicalUrl(ROUTES.PLANS),
    type: "website",
  },
};

// "PRICING": "Reuse existing pricing components." <PricingPlans> (Phase
// 31.5) is reused verbatim - `isPro={false}` always, since every visitor
// here is by definition not signed in yet (a signed-in user's own plan
// status lives at (dashboard)/pricing, untouched this phase). Its own
// "Upgrade to Pro" button is still the Phase 31.5 placeholder (no real
// Checkout exists), so the real conversion path here is "Sign up free"
// below it.
export default function PlansPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{TITLE}</h1>
        <p className="mt-3 text-muted-foreground">{DESCRIPTION}</p>
      </div>

      <PricingPlans isPro={false} />

      <div className="flex justify-center">
        <Button size="lg" nativeButton={false} render={<Link href={ROUTES.REGISTER} />}>
          Sign up free
        </Button>
      </div>
    </div>
  );
}
