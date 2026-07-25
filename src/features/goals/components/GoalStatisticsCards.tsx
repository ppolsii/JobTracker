import type { GoalStatistics } from "@/features/goals/types/goal.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

// "STATISTICS": completed goals, active goals, completion rate, average
// completion time, longest streak, current streak - all read straight off
// the already-computed GoalStatistics.
export function GoalStatisticsCards({ statistics }: { statistics: GoalStatistics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Completed goals" value={String(statistics.completedGoals)} />
      <StatCard label="Active goals" value={String(statistics.activeGoals)} />
      <StatCard
        label="Completion rate"
        value={statistics.completionRate !== null ? `${statistics.completionRate}%` : "—"}
      />
      <StatCard
        label="Avg. completion time"
        value={
          statistics.averageCompletionDays !== null
            ? `${statistics.averageCompletionDays}d`
            : "—"
        }
      />
      <StatCard label="Longest streak" value={`${statistics.longestStreak}d`} />
      <StatCard label="Current streak" value={`${statistics.currentStreak}d`} />
    </div>
  );
}
