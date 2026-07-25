import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AdvancedAnalyticsFilterBar } from "@/features/analytics/components/AdvancedAnalyticsFilterBar";
import { AdvancedAnalyticsGate } from "@/features/analytics/components/AdvancedAnalyticsGate";
import { AnalyticsComparisonTable } from "@/features/analytics/components/AnalyticsComparisonTable";
import { CompanyRankingList } from "@/features/analytics/components/CompanyRankingList";
import { EmploymentTypeAnalyticsTable } from "@/features/analytics/components/EmploymentTypeAnalyticsTable";
import { FunnelChart } from "@/features/analytics/components/FunnelChart";
import { InsightsList } from "@/features/analytics/components/InsightsList";
import { JobSearchActivitySection } from "@/features/analytics/components/JobSearchActivitySection";
import { SalarySection } from "@/features/analytics/components/SalarySection";
import { TimelineAnalysisSection } from "@/features/analytics/components/TimelineAnalysisSection";
import { WorkModeAnalyticsTable } from "@/features/analytics/components/WorkModeAnalyticsTable";
import { advancedAnalyticsFiltersSchema } from "@/features/analytics/schemas/advanced-analytics.schema";
import { AnalyticsService } from "@/features/analytics/services/analytics.service";
import { ApplicationPickerService } from "@/features/applications/services/application-picker.service";
import { AuthService } from "@/features/auth/services/auth.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Advanced Analytics" };

// IMPLEMENTATION_ORDER_V2.md Phase 33 (Advanced Analytics). A separate page
// from /analytics (never modified by this phase) - "Do not replace the
// existing Analytics page. Keep current analytics available for every
// user." Pro-gated entirely through AnalyticsService.getAdvancedSummary
// (BillingService.requireProPlan); a FORBIDDEN result renders the same
// gate a Free user sees whether they arrived via the link on the base page
// or navigated here directly.
export default async function AdvancedAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const resolvedSearchParams = await searchParams;
  const filters = advancedAnalyticsFiltersSchema.parse(resolvedSearchParams);

  const [summaryResult, pickerOptions] = await Promise.all([
    AnalyticsService.getAdvancedSummary(user.id, filters),
    ApplicationPickerService.getOptions(user.id),
  ]);

  if (!summaryResult.success) {
    if (summaryResult.error.code === ERROR_CODES.FORBIDDEN) {
      return <AdvancedAnalyticsGate />;
    }
    return (
      <p className="text-sm text-destructive">{summaryResult.error.message}</p>
    );
  }

  const {
    funnel,
    companyAnalytics,
    companyRanking,
    cvAnalytics,
    timeline,
    activity,
    workModeAnalytics,
    employmentTypeAnalytics,
    salary,
    insights,
  } = summaryResult.data;
  const { companies, cvVersions } = pickerOptions;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Advanced Analytics</h2>
        <p className="text-sm text-muted-foreground">
          A deeper look at your job search - filter by anything below to
          focus every section on a specific slice of your history.
        </p>
      </div>

      <AdvancedAnalyticsFilterBar
        defaultValues={{
          dateFrom: filters.dateFrom ?? "",
          dateTo: filters.dateTo ?? "",
          companyId: filters.companyId ?? "",
          cvVersionId: filters.cvVersionId ?? "",
          workMode: filters.workMode ?? "",
          employmentType: filters.employmentType ?? "",
          status: filters.status ?? "",
        }}
        companies={companies}
        cvVersions={cvVersions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Personal Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <InsightsList insights={insights} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart stages={funnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Performance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <CompanyRankingList ranking={companyRanking} />
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
          <CardTitle>CV Performance</CardTitle>
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
          <CardTitle>Timeline Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineAnalysisSection timeline={timeline} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Search Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <JobSearchActivitySection activity={activity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Modality</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkModeAnalyticsTable rows={workModeAnalytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Type</CardTitle>
        </CardHeader>
        <CardContent>
          <EmploymentTypeAnalyticsTable rows={employmentTypeAnalytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary</CardTitle>
        </CardHeader>
        <CardContent>
          <SalarySection salary={salary} />
        </CardContent>
      </Card>
    </div>
  );
}
