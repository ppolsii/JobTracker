import { Check } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { FREE_PLAN_APPLICATION_LIMIT } from "@/features/billing/constants/billing.constants";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

// "Pricing preview" (Home): a condensed teaser, not the full comparison -
// the dedicated Plans page (reusing PricingPlans, Phase 31.5) already owns
// the full feature-by-feature table, so this only reuses the same
// FREE_PLAN_APPLICATION_LIMIT constant (never a hardcoded "15") and links
// out to it rather than duplicating the whole comparison.
export function PricingPreviewSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Simple, transparent pricing
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>
              Up to {FREE_PLAN_APPLICATION_LIMIT} active applications, core
              tracking and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">$0</p>
          </CardContent>
        </Card>

        <Card className="ring-2 ring-primary">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>
              Unlimited applications, Calendar, Goals, and the Notification
              Center.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5 text-sm">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Unlimited
                applications
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Advanced Analytics
                & Calendar
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Goals & smart
                notifications
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={ROUTES.PLANS} />}
        >
          See full plan comparison
        </Button>
      </div>
    </section>
  );
}
