import { INSUFFICIENT_DATA_MESSAGE } from "@/features/analytics/constants/analytics.constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

// IMPLEMENTATION_ORDER_V2.md Phase 29 - ANALYTICS_ENGINE.md "Time Metrics":
// "Average Offer Time"/"Average Hiring Time", computed globally across the
// whole account. No minimum sample size is documented for either, so `null`
// simply means no application has reached that stage yet - rendered the same
// "Not enough historical data" text AnalyticsRateCards' RateCard uses for its
// own gated metrics, for visual consistency between the two top-level KPI
// sections.
function TimeMetricCard({
  label,
  days,
}: {
  label: string;
  days: number | null;
}) {
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

export function AnalyticsTimeMetrics({
  averageOfferTimeDays,
  averageHiringTimeDays,
}: {
  averageOfferTimeDays: number | null;
  averageHiringTimeDays: number | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TimeMetricCard label="Average Offer Time" days={averageOfferTimeDays} />
      <TimeMetricCard
        label="Average Hiring Time"
        days={averageHiringTimeDays}
      />
    </div>
  );
}
