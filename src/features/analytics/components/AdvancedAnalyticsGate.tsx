"use client";

import Link from "next/link";
import { useState } from "react";

import { ROUTES } from "@/config/routes";
import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { Button } from "@/shared/components/ui/button";

// "PRO ACCESS": "Free users attempting to access this section must see the
// existing Upgrade dialog." Reused unchanged (Phase 31.5), open by default -
// this component exists only so a Free user landing on /analytics/advanced
// directly (not just via the link from the base Analytics page) still sees
// the same gate, never the page's real content or a bare 403.
export function AdvancedAnalyticsGate() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Advanced Analytics is part of the Pro plan.
      </p>
      <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.ANALYTICS} />} className="w-fit">
        Back to Analytics
      </Button>
      <UpgradeDialog
        open={open}
        onOpenChange={setOpen}
        featureName="Advanced Analytics"
      />
    </div>
  );
}
