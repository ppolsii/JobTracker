import { ApplicationStatsService } from "@/features/applications/services/application-stats.service";
import type { ApplicationDashboardCounts } from "@/features/applications/services/application-stats.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import type { ActionResult } from "@/types/action-result";

// FEATURES.md/UI_SYSTEM.md "Recent Applications": undocumented exact count -
// 5 is a reasonable glance-view default, matching the option-list caps used
// elsewhere in this codebase for "small, bounded UI lists."
const RECENT_APPLICATIONS_LIMIT = 5;

export interface DashboardSummary {
  counts: ApplicationDashboardCounts;
  recentApplications: ApplicationWithRelations[];
}

// IMPLEMENTATION_ORDER.md Phase 11: "The Dashboard is an aggregation layer."
// This Service owns no business rules of its own - every number and row
// here is computed by ApplicationStatsService/ApplicationService exactly as
// those features already define it. It only combines their results into one
// view-model for the dashboard page, matching how the Applications list
// page already composes multiple Services directly (Phase 8 precedent).
export const DashboardService = {
  async getSummary(userId: string): Promise<ActionResult<DashboardSummary>> {
    const [countsResult, recentResult] = await Promise.all([
      ApplicationStatsService.getDashboardCounts(userId),
      ApplicationService.list(userId, {
        sort_by: "updated_at",
        sort_dir: "desc",
        page: 1,
        limit: RECENT_APPLICATIONS_LIMIT,
      }),
    ]);

    if (!countsResult.success) return countsResult;
    if (!recentResult.success) return recentResult;

    return {
      success: true,
      data: {
        counts: countsResult.data,
        recentApplications: recentResult.data.applications,
      },
    };
  },
};
