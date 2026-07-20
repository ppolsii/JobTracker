import type { ApplicationDashboardCounts } from "@/features/applications/services/application-stats.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

// ANALYTICS_ENGINE.md "Dashboard KPIs", reconciled with FEATURES.md Feature 7
// (see CHANGELOG "Deviations"): plain presentation of numbers this component
// receives - it makes no decisions about what counts as "active" or an
// "interview", that's ApplicationStatsService's job.
export function DashboardKpiCards({
  counts,
}: {
  counts: ApplicationDashboardCounts;
}) {
  const cards: { label: string; value: number }[] = [
    { label: "Total Applications", value: counts.total },
    { label: "Active Applications", value: counts.active },
    { label: "Interviews", value: counts.interviews },
    { label: "Offers", value: counts.offers },
    { label: "Accepted Offers", value: counts.acceptedOffers },
    { label: "Rejected Applications", value: counts.rejected },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
