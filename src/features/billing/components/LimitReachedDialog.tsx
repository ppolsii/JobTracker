"use client";

import { Check } from "lucide-react";

import {
  FREE_PLAN_APPLICATION_LIMIT,
  PRO_BENEFITS,
} from "@/features/billing/constants/billing.constants";
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

// Phase 31.5 (Pro Plan Foundation): shown instead of a plain toast when
// ApplicationService.create is denied by BillingService.requireApplicationCapacity
// (the Free plan's active-application limit). Purely presentational - the
// limit itself is still decided entirely server-side; this dialog only
// explains a decision that was already made.
export function LimitReachedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You&apos;ve reached the Free plan limit</DialogTitle>
          <DialogDescription>
            The Free plan supports up to {FREE_PLAN_APPLICATION_LIMIT} active
            applications. Archive a finished application to free up a slot,
            or upgrade to Pro for unlimited applications.
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
