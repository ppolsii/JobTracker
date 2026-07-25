import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { DashboardMockup } from "@/features/marketing/components/DashboardMockup";
import { Button } from "@/shared/components/ui/button";

// "HOME PAGE": "Hero section - Headline, Subheadline, Primary CTA,
// Secondary CTA, Dashboard screenshots."
export function HeroSection() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Run your job search like a project, not a spreadsheet.
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground text-balance">
          Track every application, company, and interview in one place - then
          let goals, streaks, and smart notifications keep you moving forward.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={ROUTES.REGISTER} />}
          >
            Sign up free
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.FEATURES} />}
          >
            See how it works
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No credit card required - up to 15 active applications, free
          forever.
        </p>
      </div>

      <div className="flex justify-center md:justify-end">
        <DashboardMockup />
      </div>
    </section>
  );
}
