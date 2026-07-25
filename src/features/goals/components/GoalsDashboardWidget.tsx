"use client";

import Link from "next/link";
import { useState } from "react";

import { ROUTES } from "@/config/routes";
import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { getGoalDisplayTitle } from "@/features/goals/utils/goal-calculations";
import type { DashboardGoalsWidgetData } from "@/features/goals/types/goal.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import type { ActionResult } from "@/types/action-result";

// "DASHBOARD WIDGET": "Today's progress, Weekly goals, Achievements
// unlocked, Upcoming deadlines" - a compact read of the same
// GoalWithProgress[]/AchievementState[] the Goals page itself computes
// (GoalService.getDashboardWidgetData), never a second calculation.
//
// A FORBIDDEN result (Free plan) renders a teaser instead of the full
// GoalsGate - "attempt the action, react to FORBIDDEN," the same pattern
// ExportMenu already established, just for a passive widget instead of a
// click. The Upgrade dialog only opens on the user's own click, never
// automatically on page load.
export function GoalsDashboardWidget({
  result,
}: {
  result: ActionResult<DashboardGoalsWidgetData>;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!result.success) {
    if (result.error.code !== ERROR_CODES.FORBIDDEN) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Track goals, streaks, and achievements with Pro.
          </p>
          <Button size="sm" className="w-fit" onClick={() => setUpgradeOpen(true)}>
            Upgrade
          </Button>
        </CardContent>
        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureName="Goals" />
      </Card>
    );
  }

  const data = result.data;
  const hasAnything =
    data.weeklyGoals.length > 0 ||
    data.recentlyUnlockedAchievements.length > 0 ||
    data.upcomingDeadlines.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Goals</CardTitle>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={ROUTES.GOALS} />}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {data.todaysApplicationCount} application
          {data.todaysApplicationCount === 1 ? "" : "s"} submitted today.
        </p>

        {!hasAnything ? (
          <p className="text-sm text-muted-foreground">No active goals.</p>
        ) : null}

        {data.weeklyGoals.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">Weekly goals</h4>
            {data.weeklyGoals.map(({ goal, progress }) => (
              <div key={goal.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{getGoalDisplayTitle(goal)}</span>
                  <span>
                    {progress.current} / {progress.target}
                  </span>
                </div>
                <Progress
                  value={Math.min(progress.current, progress.target)}
                  max={progress.target}
                  indicatorClassName={progress.isCompleted ? "bg-emerald-500" : undefined}
                />
              </div>
            ))}
          </div>
        ) : null}

        {data.recentlyUnlockedAchievements.length > 0 ? (
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">
              Achievements unlocked
            </h4>
            <p className="text-sm">
              {data.recentlyUnlockedAchievements
                .map((achievement) => achievement.definition.label)
                .join(", ")}
            </p>
          </div>
        ) : null}

        {data.upcomingDeadlines.length > 0 ? (
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">
              Upcoming deadlines
            </h4>
            <ul className="flex flex-col gap-0.5 text-sm">
              {data.upcomingDeadlines.map(({ goal, progress }) => (
                <li key={goal.id} className="flex justify-between">
                  <span>{getGoalDisplayTitle(goal)}</span>
                  <span className="text-muted-foreground">{progress.periodEnd}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
