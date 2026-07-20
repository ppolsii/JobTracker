import { AnalyticsRepository } from "@/features/analytics/repositories/analytics.repository";
import type { AnalyticsSummary } from "@/features/analytics/types/analytics.types";
import {
  buildHistoryFactsByApplication,
  computeFunnelAnalytics,
  computeGroupAnalytics,
  computeGroupAnalyticsFromStatistics,
  computeInsights,
  computeOverview,
  deriveOverviewCounts,
} from "@/features/analytics/utils/analytics-calculations";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
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

    const funnel = computeFunnelAnalytics(applications, historyFacts);
    const overview = computeOverview(
      deriveOverviewCounts(dashboardMetricsResult.data)
    );
    const insights = computeInsights(
      cvAnalytics,
      sourceAnalytics,
      companyAnalytics,
      funnel
    );

    return {
      success: true,
      data: {
        overview,
        companyAnalytics,
        cvAnalytics,
        sourceAnalytics,
        monthlyAnalytics,
        funnel,
        insights,
      },
    };
  },
};
