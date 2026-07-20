import type { FunnelStageRow } from "@/features/analytics/types/analytics.types";
import { EmptyState } from "@/shared/components/EmptyState";

// ANALYTICS_ENGINE.md "Funnel Analytics", visualized as simple CSS-width
// bars rather than a charting library - no chart dependency is installed or
// approved yet (IMPLEMENTATION_RULES.md requires approval before adding
// one). Purely presentational: every number rendered here was already
// computed by AnalyticsService: this component defines no business rule.
export function FunnelChart({ stages }: { stages: FunnelStageRow[] }) {
  const baseline = stages[0]?.entering ?? 0;

  if (baseline === 0) {
    return (
      <EmptyState
        title="No funnel data yet"
        description="Once you have applications moving through your recruitment pipeline, the funnel will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage) => {
        const widthPercent = Math.round((stage.entering / baseline) * 100);
        return (
          <div key={stage.stage} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.stage}</span>
              <span className="text-muted-foreground">
                {stage.entering} applications
                {stage.conversionRate !== null
                  ? ` · ${stage.conversionRate}% progressed`
                  : ""}
                {stage.dropOffRate !== null && stage.dropOffRate > 0
                  ? ` · ${stage.dropOffRate}% rejected here`
                  : ""}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
