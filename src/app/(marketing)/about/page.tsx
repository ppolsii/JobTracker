import type { Metadata } from "next";

import { ROUTES } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";

const TITLE = "About";
const DESCRIPTION = `Why ${siteConfig.name} exists, and who it's built for.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl(ROUTES.ABOUT) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonicalUrl(ROUTES.ABOUT),
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        About {siteConfig.name}
      </h1>

      <p className="text-muted-foreground">
        A job search generates far more information than any spreadsheet can
        comfortably hold: which company, which role, which CV version, what
        stage you&apos;re at, what a recruiter said last Tuesday, how the
        technical interview actually went. {siteConfig.name} exists to turn
        all of that into one organized, searchable history - instead of
        living across your inbox, your memory, and a dozen browser tabs.
      </p>

      <p className="text-muted-foreground">
        We built it for anyone actively applying to jobs - whether it&apos;s
        your first search or your fifth, whether you&apos;re applying with
        one CV or several, and whether you want to just track what
        you&apos;ve done or actively understand what&apos;s working and
        what isn&apos;t.
      </p>

      <p className="text-muted-foreground">
        The Free plan is a complete, real tool on its own - not a stripped-down
        trial. Pro exists for people who want more room to grow and deeper
        insight into their own search, not as a paywall on the basics.
      </p>
    </div>
  );
}
