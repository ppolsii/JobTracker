import { Flame } from "lucide-react";

import type { StreakSummary } from "@/features/goals/types/goal.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

function StreakStat({ label, current, longest }: { label: string; current: number; longest: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-xl font-semibold">
        <Flame className={current > 0 ? "size-5 text-amber-500" : "size-5 text-muted-foreground"} />
        {current}
      </span>
      <span className="text-xs text-muted-foreground">Longest: {longest}</span>
    </div>
  );
}

// "STREAKS": "Display achievements visually." Daily figures are reused as-is
// from Advanced Analytics' computeActivityAnalysis; weekly/monthly are new
// (see goal-calculations.ts).
export function StreakSummaryCard({ streaks }: { streaks: StreakSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Streaks</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StreakStat
          label="Daily streak"
          current={streaks.currentDayStreak}
          longest={streaks.longestDayStreak}
        />
        <StreakStat
          label="Weekly streak"
          current={streaks.currentWeekStreak}
          longest={streaks.longestWeekStreak}
        />
        <StreakStat
          label="Monthly streak"
          current={streaks.currentMonthStreak}
          longest={streaks.longestMonthStreak}
        />
      </CardContent>
    </Card>
  );
}
