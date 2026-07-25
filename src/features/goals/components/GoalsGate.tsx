"use client";

import Link from "next/link";
import { useState } from "react";

import { ROUTES } from "@/config/routes";
import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { Button } from "@/shared/components/ui/button";

// "PRO ACCESS": "Reuse the existing BillingService. If a Free user attempts
// to access this feature: Show the existing Upgrade dialog. Do not create a
// new entitlement system." Mirrors CalendarGate/AdvancedAnalyticsGate
// exactly.
export function GoalsGate() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Goals is part of the Pro plan.
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={ROUTES.DASHBOARD} />}
        className="w-fit"
      >
        Back to Dashboard
      </Button>
      <UpgradeDialog open={open} onOpenChange={setOpen} featureName="Goals" />
    </div>
  );
}
