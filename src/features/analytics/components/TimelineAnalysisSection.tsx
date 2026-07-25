import { INSUFFICIENT_DATA_MESSAGE } from "@/features/analytics/constants/analytics.constants";
import type { TimelineAnalysis } from "@/features/analytics/types/advanced-analytics.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

function StatCard({ label, days }: { label: string; days: number | null }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {days === null ? (
          <p className="text-sm text-muted-foreground">
            {INSUFFICIENT_DATA_MESSAGE}
          </p>
        ) : (
          <p className="text-2xl font-semibold">{days}d</p>
        )}
      </CardContent>
    </Card>
  );
}

// "SECTION 4 Timeline Analysis". Every number here was already computed by
// AnalyticsService.getAdvancedSummary (computeTimelineAnalysis) - this
// component only renders it.
export function TimelineAnalysisSection({
  timeline,
}: {
  timeline: TimelineAnalysis;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {timeline.steps.map((step) => (
          <div
            key={`${step.from}-${step.to}`}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted-foreground">
              {step.from} → {step.to}
            </span>
            <span className="font-medium">
              {step.averageDays === null ? "—" : `${step.averageDays}d avg`}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fastest process" days={timeline.process.fastestDays} />
        <StatCard label="Slowest process" days={timeline.process.slowestDays} />
        <StatCard label="Median duration" days={timeline.process.medianDays} />
      </div>
    </div>
  );
}
