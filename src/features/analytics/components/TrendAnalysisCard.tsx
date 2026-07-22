import { INSUFFICIENT_DATA_MESSAGE } from "@/features/analytics/constants/analytics.constants";
import type { TrendAnalysis } from "@/features/analytics/types/analytics.types";

// ANALYTICS_ENGINE.md "Trend Analysis": "Compare current month against
// previous month... Represent changes as percentages." `trend` is `null`
// below the documented 2-month minimum (AnalyticsService/computeTrendAnalysis
// decide this, not this component). A `null` individual growth figure means
// the previous month had zero of that count (division by zero), rendered as
// "—" the same way every other ungated day/rate figure in this feature does.
function GrowthFigure({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">
        {value === null ? "—" : `${value > 0 ? "+" : ""}${value}%`}
      </span>
    </div>
  );
}

export function TrendAnalysisCard({ trend }: { trend: TrendAnalysis | null }) {
  if (!trend) {
    return (
      <p className="text-sm text-muted-foreground">
        {INSUFFICIENT_DATA_MESSAGE}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {trend.currentMonth} vs. {trend.previousMonth}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GrowthFigure label="Application Growth" value={trend.applicationGrowth} />
        <GrowthFigure label="Interview Growth" value={trend.interviewGrowth} />
        <GrowthFigure label="Offer Growth" value={trend.offerGrowth} />
        <GrowthFigure label="Response Growth" value={trend.responseGrowth} />
      </div>
    </div>
  );
}
