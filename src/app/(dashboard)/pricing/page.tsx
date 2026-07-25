import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { PricingPlans } from "@/features/billing/components/PricingPlans";
import { BillingService } from "@/features/billing/services/billing.service";

export const metadata: Metadata = { title: "Pricing" };

// Phase 31.5 (Pro Plan Foundation). This page only composes BillingService
// (to know whether the current visitor is already on Pro, so the CTA reads
// correctly) and PricingPlans - it defines no plan/feature data of its own.
export default async function PricingPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const subscriptionResult = await BillingService.getSubscriptionForUser(
    user.id
  );
  if (!subscriptionResult.success) {
    return (
      <p className="text-sm text-destructive">
        {subscriptionResult.error.message}
      </p>
    );
  }

  const isPro = subscriptionResult.data?.plan === "pro";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Pricing</h2>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits how you&apos;re job hunting right now.
        </p>
      </div>

      <PricingPlans isPro={isPro} />
    </div>
  );
}
