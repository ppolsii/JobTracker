"use client";

import Link from "next/link";
import { useState } from "react";

import { ROUTES } from "@/config/routes";
import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { Button } from "@/shared/components/ui/button";

// "PRO ACCESS": "Free users attempting to access notifications should see
// the existing Upgrade dialog." Mirrors GoalsGate/CalendarGate exactly.
export function NotificationsGate() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        The Notification Center is part of the Pro plan.
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={ROUTES.DASHBOARD} />}
        className="w-fit"
      >
        Back to Dashboard
      </Button>
      <UpgradeDialog open={open} onOpenChange={setOpen} featureName="Notifications" />
    </div>
  );
}
