import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AnalyticsComparisonTable } from "@/features/analytics/components/AnalyticsComparisonTable";
import { AnalyticsRateCards } from "@/features/analytics/components/AnalyticsRateCards";
import { AnalyticsTimeMetrics } from "@/features/analytics/components/AnalyticsTimeMetrics";
import { EmploymentTypeAnalyticsTable } from "@/features/analytics/components/EmploymentTypeAnalyticsTable";
import { FunnelChart } from "@/features/analytics/components/FunnelChart";
import { InsightsList } from "@/features/analytics/components/InsightsList";
import { TrendAnalysisCard } from "@/features/analytics/components/TrendAnalysisCard";
import { WorkModeAnalyticsTable } from "@/features/analytics/components/WorkModeAnalyticsTable";
import { AnalyticsService } from "@/features/analytics/services/analytics.service";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Analytics" };

// IMPLEMENTATION_ORDER.md Phase 12: Response/Interview/Offer Rate, Monthly/
// Company/CV/Source Analytics, Funnel Analytics, Insights.
// IMPLEMENTATION_ORDER_V2.md Phase 29: Acceptance Rate, Average Offer/Hiring
// Time, Work Mode/Employment Type Analytics, Trend Analysis. This page only
// composes AnalyticsService's output (UI_SYSTEM.md "Analytics Page": the
// page must "communicate value immediately" - it defines no metric of its
// own, per this phase's "Charts never define business rules").
export default async function AnalyticsPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const result = await AnalyticsService.getSummary(user.id);
  if (!result.success) {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const {
    overview,
    companyAnalytics,
    cvAnalytics,
    sourceAnalytics,
    monthlyAnalytics,
    workModeAnalytics,
    employmentTypeAnalytics,
    funnel,
    trend,
    insights,
  } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Analytics</h2>

      <AnalyticsRateCards overview={overview} />

      <AnalyticsTimeMetrics
        averageOfferTimeDays={overview.averageOfferTimeDays}
        averageHiringTimeDays={overview.averageHiringTimeDays}
      />

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <InsightsList insights={insights} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendAnalysisCard trend={trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart stages={funnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsComparisonTable
            nameColumnLabel="Month"
            rows={monthlyAnalytics}
            emptyTitle="No monthly data yet"
            emptyDescription="Applications with a recorded application date will appear here, grouped by month."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsComparisonTable
            nameColumnLabel="Company"
            rows={companyAnalytics}
            emptyTitle="No company data yet"
            emptyDescription="Create applications for your companies to see a breakdown here."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CV Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsComparisonTable
            nameColumnLabel="CV Version"
            rows={cvAnalytics}
            emptyTitle="No CV data yet"
            emptyDescription="Create applications with a CV version to see a breakdown here."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsComparisonTable
            nameColumnLabel="Source"
            rows={sourceAnalytics}
            emptyTitle="No source data yet"
            emptyDescription="Record where your applications came from to see a breakdown here."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Mode Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkModeAnalyticsTable rows={workModeAnalytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Type Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <EmploymentTypeAnalyticsTable rows={employmentTypeAnalytics} />
        </CardContent>
      </Card>
    </div>
  );
}
