import type { ActivityAnalysis } from "@/features/analytics/types/advanced-analytics.types";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

// "SECTION 5 Job Search Activity". Streaks, most/least active month, and a
// recent-weeks bar chart (CSS width bars, matching FunnelChart's own
// hand-rolled style - no chart dependency is installed or approved).
export function JobSearchActivitySection({
  activity,
}: {
  activity: ActivityAnalysis;
}) {
  if (activity.perWeek.length === 0) {
    return (
      <EmptyState
        title="No activity data yet"
        description="Applications with a recorded application date will appear here."
      />
    );
  }

  const maxWeekCount = Math.max(...activity.perWeek.map((week) => week.applications));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current streak"
          value={`${activity.currentStreakDays} day${activity.currentStreakDays === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Longest streak"
          value={`${activity.longestStreakDays} day${activity.longestStreakDays === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Most active month"
          value={activity.mostActiveMonth ? activity.mostActiveMonth.month : "—"}
        />
        <StatCard
          label="Least active month"
          value={activity.leastActiveMonth ? activity.leastActiveMonth.month : "—"}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Applications per week (most recent)
        </p>
        {activity.perWeek.map((week) => (
          <div key={week.week} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-muted-foreground">
              {week.week}
            </span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.round((week.applications / maxWeekCount) * 100)}%`,
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-medium">
              {week.applications}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
