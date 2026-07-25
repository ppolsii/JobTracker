"use client";

import { Check } from "lucide-react";

import { PRO_BENEFITS } from "@/features/billing/constants/billing.constants";
import { UpgradeButton } from "@/features/billing/components/UpgradeButton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

// Phase 31.5 (Pro Plan Foundation): shown whenever the user attempts to use
// a feature the server denied with a Pro-required error (currently only
// Export - see ExportMenu), instead of a plain toast. Purely presentational:
// the decision that this feature requires Pro was already made by
// BillingService.requireProPlan before this dialog is ever shown; this
// component explains that decision, it doesn't make it.
export function UpgradeDialog({
  open,
  onOpenChange,
  featureName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{featureName} requires Pro</DialogTitle>
          <DialogDescription>
            {featureName} is part of the Pro plan. Upgrade to unlock it, along
            with everything else Pro includes.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2 text-sm">
          {PRO_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Maybe later
          </DialogClose>
          <UpgradeButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
