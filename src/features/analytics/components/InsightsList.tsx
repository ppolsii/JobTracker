import { INSUFFICIENT_DATA_MESSAGE } from "@/features/analytics/constants/analytics.constants";

// ANALYTICS_ENGINE.md "Insights": plain, deterministic sentences computed
// entirely by AnalyticsService - this component only renders strings, it
// never generates or evaluates them.
export function InsightsList({ insights }: { insights: string[] }) {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {INSUFFICIENT_DATA_MESSAGE}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {insights.map((insight) => (
        <li key={insight} className="text-sm">
          {insight}
        </li>
      ))}
    </ul>
  );
}
