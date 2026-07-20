import type { AnalyticsSummary } from "@/features/analytics/types/analytics.types";
import {
  buildHistoryFactsByApplication,
  computeFunnelAnalytics,
  computeGroupAnalytics,
  computeInsights,
  computeOverview,
} from "@/features/analytics/utils/analytics-calculations";
import { ApplicationStatsService } from "@/features/applications/services/application-stats.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER.md Phase 12: Analytics is a pure aggregation layer.
// Every number here is either reused directly from ApplicationStatsService
// (Interview Rate, Offer Rate, Response Rate's own inputs) or computed from
// bulk reads already owned by ApplicationService/ApplicationStatusService
// (Company/CV/Source/Monthly Analytics, Funnel, Insights) - this Service
// introduces no new database access of its own and no repository of its
// own, matching the Dashboard (Phase 11) precedent exactly. The actual
// calculation logic lives in utils/analytics-calculations.ts (pure
// functions, no I/O) - this file is orchestration only: fetch, then call.
export const AnalyticsService = {
  async getSummary(userId: string): Promise<ActionResult<AnalyticsSummary>> {
    const [applicationsResult, countsResult] = await Promise.all([
      ApplicationService.listAllForAnalytics(userId),
      ApplicationStatsService.getDashboardCounts(userId),
    ]);

    if (!applicationsResult.success) return applicationsResult;
    if (!countsResult.success) return countsResult;

    const applications = applicationsResult.data;
    const counts = countsResult.data;

    const historyResult =
      await ApplicationStatusService.listHistoryForApplications(
        applications.map((app) => app.id)
      );
    if (!historyResult.success) return historyResult;

    const historyFacts = buildHistoryFactsByApplication(historyResult.data);

    const companyAnalytics = computeGroupAnalytics(
      applications,
      historyFacts,
      (app) => app.company_id,
      (app) => app.companies.name
    );

    // ANALYTICS_ENGINE.md "CV Analytics": "Sort by: Interview Rate
    // descending."
    const cvAnalytics = computeGroupAnalytics(
      applications,
      historyFacts,
      (app) => app.cv_version_id,
      (app) => app.cv_versions.name
    ).sort((a, b) => (b.interviewRate ?? -1) - (a.interviewRate ?? -1));

    // Applications with no recorded source are excluded rather than
    // grouped under an invented "Unknown" bucket - DATABASE.md's
    // application_source enum has no such value.
    const sourceAnalytics = computeGroupAnalytics(
      applications,
      historyFacts,
      (app) => app.source,
      (app) => app.source ?? ""
    );

    // Wishlist-stage applications have no application_date yet (Phase 8) and
    // are excluded from a date-keyed timeline for the same reason.
    const monthlyAnalytics = computeGroupAnalytics(
      applications,
      historyFacts,
      (app) => app.application_date?.slice(0, 7) ?? null,
      (app) => app.application_date!.slice(0, 7)
    ).sort((a, b) => a.id.localeCompare(b.id));

    const funnel = computeFunnelAnalytics(applications, historyFacts);
    const overview = computeOverview(counts);
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
