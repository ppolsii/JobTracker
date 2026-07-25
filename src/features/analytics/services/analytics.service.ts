import { AnalyticsRepository } from "@/features/analytics/repositories/analytics.repository";
import type {
  AdvancedAnalyticsFilters,
  AdvancedAnalyticsSummary,
} from "@/features/analytics/types/advanced-analytics.types";
import type { AnalyticsSummary } from "@/features/analytics/types/analytics.types";
import {
  buildHistoryFactsByApplication,
  computeAverageHiringTimeDays,
  computeAverageOfferTimeDays,
  computeEmploymentTypeAnalytics,
  computeFunnelAnalytics,
  computeGroupAnalytics,
  computeGroupAnalyticsFromStatistics,
  computeInsights,
  computeOverview,
  computeTrendAnalysis,
  computeWorkModeAnalytics,
  deriveOverviewCounts,
} from "@/features/analytics/utils/analytics-calculations";
import {
  computeActivityAnalysis,
  computeAdvancedInsights,
  computeSalaryAnalysis,
  computeTimelineAnalysis,
  filterApplicationsForAdvancedAnalytics,
  rankCompanies,
} from "@/features/analytics/utils/advanced-analytics-calculations";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER.md Phase 12: Analytics is a pure aggregation layer.
// IMPLEMENTATION_ORDER_V2.md Phase 21: Company/CV/Monthly Analytics and the
// Overview counts are now sourced from Phase 21's statistics views
// (AnalyticsRepository) instead of being counted here - same numbers,
// computed by the database. Source Analytics, Funnel Analytics, Insights
// and Average Response Time have no corresponding view and are still
// computed from the bulk applications/history reads exactly as before -
// see analytics-calculations.ts for why. This file remains orchestration
// only: fetch, then call the pure calculation functions.
// IMPLEMENTATION_ORDER_V2.md Phase 29: Work Mode/Employment Type Analytics
// join Source Analytics in grouping the same bulk applications fetch (no
// view backs either); Acceptance Rate/Average Offer/Hiring Time extend the
// existing dashboard_metrics-derived Overview; Trend Analysis is derived
// from the already-computed monthlyAnalytics, not a new data source.
export const AnalyticsService = {
  async getSummary(userId: string): Promise<ActionResult<AnalyticsSummary>> {
    const [
      applicationsResult,
      dashboardMetricsResult,
      companyStatisticsResult,
      cvStatisticsResult,
      monthlyStatisticsResult,
    ] = await Promise.all([
      ApplicationService.listAllForAnalytics(userId),
      AnalyticsRepository.getDashboardMetrics(userId),
      AnalyticsRepository.getCompanyStatistics(userId),
      AnalyticsRepository.getCvStatistics(userId),
      AnalyticsRepository.getMonthlyStatistics(userId),
    ]);

    if (!applicationsResult.success) return applicationsResult;

    const statisticsErrors = [
      dashboardMetricsResult.error,
      companyStatisticsResult.error,
      cvStatisticsResult.error,
      monthlyStatisticsResult.error,
    ];
    if (statisticsErrors.some((error) => error)) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading analytics data.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    const applications = applicationsResult.data;

    const historyResult =
      await ApplicationStatusService.listHistoryForApplications(
        applications.map((app) => app.id)
      );
    if (!historyResult.success) return historyResult;

    const historyFacts = buildHistoryFactsByApplication(historyResult.data);

    const companyAnalytics = computeGroupAnalyticsFromStatistics(
      companyStatisticsResult.data ?? [],
      applications,
      historyFacts,
      (app) => app.company_id
    );

    // ANALYTICS_ENGINE.md "CV Analytics": "Sort by: Interview Rate
    // descending."
    const cvAnalytics = computeGroupAnalyticsFromStatistics(
      cvStatisticsResult.data ?? [],
      applications,
      historyFacts,
      (app) => app.cv_version_id
    ).sort((a, b) => (b.interviewRate ?? -1) - (a.interviewRate ?? -1));

    // Applications with no recorded source are excluded rather than
    // grouped under an invented "Unknown" bucket - DATABASE.md's
    // application_source enum has no such value. No view backs this
    // grouping (DATABASE.md reserves no `source_statistics` name).
    const sourceAnalytics = computeGroupAnalytics(
      applications,
      historyFacts,
      (app) => app.source,
      (app) => app.source ?? ""
    );

    // Wishlist-stage applications have no application_date yet (Phase 8)
    // and are excluded from a date-keyed timeline for the same reason -
    // monthly_statistics excludes them identically.
    const monthlyAnalytics = computeGroupAnalyticsFromStatistics(
      monthlyStatisticsResult.data ?? [],
      applications,
      historyFacts,
      (app) => app.application_date?.slice(0, 7) ?? null
    ).sort((a, b) => a.id.localeCompare(b.id));

    // IMPLEMENTATION_ORDER_V2.md Phase 29: Work Mode/Employment Type
    // Analytics have no backing view (same reasoning as Source Analytics),
    // so they group the same bulk `applications` fetch above. Average
    // Offer/Hiring Time are computed globally across all applications, not
    // per grouping.
    const workModeAnalytics = computeWorkModeAnalytics(applications);
    const employmentTypeAnalytics = computeEmploymentTypeAnalytics(
      applications,
      historyFacts
    );

    const funnel = computeFunnelAnalytics(applications, historyFacts);
    const overview = computeOverview(
      deriveOverviewCounts(dashboardMetricsResult.data),
      {
        averageOfferTimeDays: computeAverageOfferTimeDays(
          applications,
          historyFacts
        ),
        averageHiringTimeDays: computeAverageHiringTimeDays(
          applications,
          historyFacts
        ),
      }
    );
    const insights = computeInsights(
      cvAnalytics,
      sourceAnalytics,
      companyAnalytics,
      funnel
    );
    const trend = computeTrendAnalysis(monthlyAnalytics);

    return {
      success: true,
      data: {
        totalApplications: applications.length,
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
      },
    };
  },

  // IMPLEMENTATION_ORDER_V2.md Phase 33 (Advanced Analytics) - Pro-only
  // (BUSINESS_RULES.md "Billing"): reuses BillingService.requireProPlan, the
  // same check Export/Smart Job Import already use, rather than a second,
  // duplicated plan check. Filters are applied once, in memory, before any
  // calculation runs - see advanced-analytics-calculations.ts for why this
  // path does not use the Phase 21 statistics views (they have no filter
  // parameters). Company/CV/Monthly groupings are therefore computed via
  // computeGroupAnalytics (the same bulk-fetch path Source Analytics already
  // uses), not computeGroupAnalyticsFromStatistics - deliberately, so every
  // section here respects the same filters uniformly.
  async getAdvancedSummary(
    userId: string,
    filters: AdvancedAnalyticsFilters
  ): Promise<ActionResult<AdvancedAnalyticsSummary>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const applicationsResult = await ApplicationService.listAllForAnalytics(userId);
    if (!applicationsResult.success) return applicationsResult;

    const applications = applicationsResult.data;
    const filteredApplications = filterApplicationsForAdvancedAnalytics(
      applications,
      filters
    );

    const historyResult = await ApplicationStatusService.listHistoryForApplications(
      applications.map((app) => app.id)
    );
    if (!historyResult.success) return historyResult;

    const historyFacts = buildHistoryFactsByApplication(historyResult.data);

    const companyAnalytics = computeGroupAnalytics(
      filteredApplications,
      historyFacts,
      (app) => app.company_id,
      (app) => app.companies.name
    );

    const cvAnalytics = computeGroupAnalytics(
      filteredApplications,
      historyFacts,
      (app) => app.cv_version_id,
      (app) => app.cv_versions.name
    ).sort((a, b) => (b.interviewRate ?? -1) - (a.interviewRate ?? -1));

    // Same date-slicing key the base page's monthlyAnalytics uses, computed
    // via the bulk path instead of the monthly_statistics view so filters
    // apply here too (see this method's own comment above).
    const monthlyAnalytics = computeGroupAnalytics(
      filteredApplications,
      historyFacts,
      (app) => app.application_date?.slice(0, 7) ?? null,
      (app) => app.application_date?.slice(0, 7) ?? ""
    ).sort((a, b) => a.id.localeCompare(b.id));

    const workModeAnalytics = computeWorkModeAnalytics(filteredApplications);
    const employmentTypeAnalytics = computeEmploymentTypeAnalytics(
      filteredApplications,
      historyFacts
    );
    const funnel = computeFunnelAnalytics(filteredApplications, historyFacts);

    return {
      success: true,
      data: {
        funnel,
        companyAnalytics,
        companyRanking: rankCompanies(companyAnalytics),
        cvAnalytics,
        timeline: computeTimelineAnalysis(filteredApplications, historyFacts),
        activity: computeActivityAnalysis(filteredApplications, monthlyAnalytics),
        workModeAnalytics,
        employmentTypeAnalytics,
        salary: computeSalaryAnalysis(filteredApplications),
        insights: computeAdvancedInsights(filteredApplications, workModeAnalytics),
      },
    };
  },
};
