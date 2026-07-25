"use client";

import Link from "next/link";
import { useState } from "react";

import { ROUTES } from "@/config/routes";
import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { Button } from "@/shared/components/ui/button";

// "PRO ACCESS": "If a Free user attempts to access the Calendar: Show the
// existing Upgrade dialog. Do not create a new Pro gating system." Reused
// unchanged (Phase 31.5), open by default - mirrors AdvancedAnalyticsGate
// (Phase 33) exactly, so a Free user sees the identical gate regardless of
// which Pro-only page they land on.
export function CalendarGate() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Calendar is part of the Pro plan.
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={ROUTES.DASHBOARD} />}
        className="w-fit"
      >
        Back to Dashboard
      </Button>
      <UpgradeDialog open={open} onOpenChange={setOpen} featureName="Calendar" />
    </div>
  );
}
