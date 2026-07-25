import type { Metadata } from "next";

import { ROUTES } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";

const TITLE = "Privacy Policy";
const DESCRIPTION = `How ${siteConfig.name} collects, uses, and protects your data.`;
const LAST_UPDATED = "July 24, 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl(ROUTES.PRIVACY) },
  robots: { index: true, follow: true },
};

// Scoped to what this application actually does (BUSINESS_RULES.md/
// DATABASE.md) - no claims about compliance frameworks or self-service
// capabilities (e.g. account deletion) this app hasn't actually built.
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{TITLE}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">What we collect</h2>
        <p className="text-muted-foreground">
          Your account email and password (handled by our authentication
          provider), and whatever you choose to enter while using{" "}
          {siteConfig.name}: applications, companies, CV version names,
          status history, notes, interview feedback, calendar events, and
          goals. We only collect what the product needs to function.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">How we use it</h2>
        <p className="text-muted-foreground">
          Solely to provide the service to you: storing your data, computing
          your own analytics and progress, and - if you&apos;re on the Pro
          plan - processing your subscription through our payment processor,
          Stripe. We do not sell your data, and we do not use it to train any
          third-party model.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Where it&apos;s stored</h2>
        <p className="text-muted-foreground">
          Your data is stored in a managed PostgreSQL database (Supabase),
          protected by row-level security so that only you can read or write
          your own records.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p className="text-muted-foreground">
          We use a single, essential session cookie to keep you signed in.
          We do not use advertising or third-party tracking cookies.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Your data, your control</h2>
        <p className="text-muted-foreground">
          Pro plan users can export their entire account&apos;s data (CSV or
          JSON) at any time from within the app. To request a copy of your
          data or deletion of your account, contact us at{" "}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="text-primary underline"
          >
            {siteConfig.supportEmail}
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Changes to this policy</h2>
        <p className="text-muted-foreground">
          If we make a material change to this policy, we&apos;ll update the
          date above.
        </p>
      </section>
    </div>
  );
}
