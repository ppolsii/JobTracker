import { INSUFFICIENT_DATA_MESSAGE } from "@/features/analytics/constants/analytics.constants";
import type {
  AnalyticsOverview,
  RateMetric,
} from "@/features/analytics/types/analytics.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

// ANALYTICS_ENGINE.md "Success Metrics" (Response/Interview/Offer Rate) +
// "Empty State Behaviour": each card shows the Service-computed value, or
// the exact documented "Not enough historical data" text when
// `meetsMinimum` is false - this component makes no threshold decisions of
// its own, only renders what AnalyticsService already decided.
function RateCard({ label, metric }: { label: string; metric: RateMetric }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metric.meetsMinimum && metric.value !== null ? (
          <p className="text-2xl font-semibold">{metric.value}%</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {INSUFFICIENT_DATA_MESSAGE}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsRateCards({
  overview,
}: {
  overview: AnalyticsOverview;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <RateCard label="Response Rate" metric={overview.responseRate} />
      <RateCard label="Interview Rate" metric={overview.interviewRate} />
      <RateCard label="Offer Rate" metric={overview.offerRate} />
    </div>
  );
}
