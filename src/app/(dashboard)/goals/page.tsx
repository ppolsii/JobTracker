import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { AchievementsGrid } from "@/features/goals/components/AchievementsGrid";
import { CreateGoalButton } from "@/features/goals/components/CreateGoalButton";
import { GoalStatisticsCards } from "@/features/goals/components/GoalStatisticsCards";
import { GoalsBoard } from "@/features/goals/components/GoalsBoard";
import { GoalsGate } from "@/features/goals/components/GoalsGate";
import { StreakSummaryCard } from "@/features/goals/components/StreakSummaryCard";
import { GoalService } from "@/features/goals/services/goal.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Goals" };

// IMPLEMENTATION_ORDER_V2.md Phase 35 (Goals, Achievements & Progress).
// Pro-gated entirely through GoalService.getGoalsPageData (BillingService.
// requireProPlan); a FORBIDDEN result renders GoalsGate, the same pattern
// Calendar/Advanced Analytics/Smart Job Import already established.
export default async function GoalsPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const result = await GoalService.getGoalsPageData(user.id);

  if (!result.success) {
    if (result.error.code === ERROR_CODES.FORBIDDEN) {
      return <GoalsGate />;
    }
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const { goalsWithProgress, streaks, statistics, achievements } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Goals</h2>
        <CreateGoalButton />
      </div>

      <GoalStatisticsCards statistics={statistics} />

      <StreakSummaryCard streaks={streaks} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <AchievementsGrid achievements={achievements} />
        </CardContent>
      </Card>

      <GoalsBoard goalsWithProgress={goalsWithProgress} />
    </div>
  );
}
