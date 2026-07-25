"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { createBillingPortalSessionAction } from "@/features/billing/actions/billing.actions";
import { Button } from "@/shared/components/ui/button";

// IMPLEMENTATION_ORDER_V2.md Phase 38 (Production Billing): replaces Phase
// 31.5's placeholder with a real redirect to Stripe's Customer Portal, where
// updating the payment method, downloading invoices, and cancelling/
// resuming the subscription are all handled by Stripe's own hosted UI (per
// whatever features are enabled in the Stripe Dashboard's Customer Portal
// configuration - not reimplemented here). Shown only for Pro users (see
// SubscriptionSection).
export function ManageSubscriptionButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createBillingPortalSessionAction();
      if (!result.success) {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Button type="button" variant="outline" loading={isPending} onClick={handleClick}>
      Manage subscription
    </Button>
  );
}
