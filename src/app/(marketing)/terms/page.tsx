import type { Metadata } from "next";

import { FREE_PLAN_APPLICATION_LIMIT } from "@/features/billing/constants/billing.constants";
import { ROUTES } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";

const TITLE = "Terms of Service";
const DESCRIPTION = `The terms that govern your use of ${siteConfig.name}.`;
const LAST_UPDATED = "July 24, 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl(ROUTES.TERMS) },
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{TITLE}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">1. Your account</h2>
        <p className="text-muted-foreground">
          You&apos;re responsible for the accuracy of the information you
          enter and for keeping your account credentials secure.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">2. Plans and billing</h2>
        <p className="text-muted-foreground">
          The Free plan supports up to {FREE_PLAN_APPLICATION_LIMIT} active
          applications at no cost. The Pro plan is a paid subscription
          billed on a recurring basis; you may cancel at any time from
          Settings, and access continues until the end of the current
          billing period.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">3. Acceptable use</h2>
        <p className="text-muted-foreground">
          You agree not to use {siteConfig.name} to store unlawful content,
          to attempt to access another user&apos;s data, or to disrupt the
          service for other users.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">4. Your content</h2>
        <p className="text-muted-foreground">
          You retain all rights to the data you enter. We only use it to
          provide the service to you (see our Privacy Policy).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">5. Service availability</h2>
        <p className="text-muted-foreground">
          We aim to keep {siteConfig.name} available at all times but do not
          guarantee uninterrupted access. The service is provided
          &ldquo;as is&rdquo; without warranties of any kind.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">6. Limitation of liability</h2>
        <p className="text-muted-foreground">
          To the fullest extent permitted by law, {siteConfig.name} is not
          liable for indirect, incidental, or consequential damages arising
          from your use of the service.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">7. Changes to these terms</h2>
        <p className="text-muted-foreground">
          If we make a material change to these terms, we&apos;ll update the
          date above.
        </p>
      </section>
    </div>
  );
}
