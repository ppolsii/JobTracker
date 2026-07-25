"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { createCheckoutSessionAction } from "@/features/billing/actions/billing.actions";
import type { BillingInterval } from "@/features/billing/types/billing.types";
import { Button, type buttonVariants } from "@/shared/components/ui/button";
import type { VariantProps } from "class-variance-authority";

// IMPLEMENTATION_ORDER_V2.md Phase 38 (Production Billing): replaces Phase
// 31.5's placeholder (a toast saying upgrading wasn't available yet) with a
// real Stripe Checkout redirect. Every "Upgrade to Pro" call site in the
// app (Pricing/Plans pages, Subscription section, Upgrade dialog, Limit
// Reached dialog) renders this one component - all four got real checkout
// simply by this file changing, with no call site needing an update.
// `createCheckoutSessionAction` redirects on success (it never returns), so
// this component only ever has an *error* to react to.
export function UpgradeButton({
  children = "Upgrade to Pro",
  interval = "month",
  variant,
  size,
  className,
}: {
  children?: React.ReactNode;
  interval?: BillingInterval;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createCheckoutSessionAction(interval);
      if (!result.success) {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      loading={isPending}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}
