import { AlertTriangle } from "lucide-react";

import { UpgradeButton } from "@/features/billing/components/UpgradeButton";
import { getUsageStatus } from "@/features/billing/utils/usage-status";
import { Progress } from "@/shared/components/ui/progress";

// Phase 31.5 (Pro Plan Foundation). Free-plan only - a Pro user has no
// limit to show usage against (BillingService.getApplicationUsage returns
// `limit: null` for Pro, and callers simply don't render this component in
// that case).
export function UsageIndicator({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const status = getUsageStatus(used, limit);
  const atLimit = status === "at-limit";
  const approachingLimit = status === "approaching-limit";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Applications used</span>
        <span className="font-medium">
          {used} / {limit}
        </span>
      </div>

      <Progress
        value={Math.min(used, limit)}
        max={limit}
        aria-label="Active applications used"
        indicatorClassName={
          atLimit
            ? "bg-destructive"
            : approachingLimit
              ? "bg-amber-500"
              : undefined
        }
      />

      {atLimit ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            You&apos;ve reached the Free plan limit.
          </p>
          <UpgradeButton size="sm" />
        </div>
      ) : approachingLimit ? (
        <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
          <AlertTriangle className="size-4" />
          You are approaching the Free plan limit.
        </p>
      ) : null}
    </div>
  );
}
