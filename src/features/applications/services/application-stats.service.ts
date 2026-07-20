import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import {
  INTERVIEW_STAGE_STATUSES,
  OFFER_STAGE_STATUSES,
  UNRESPONDED_STATUSES,
} from "@/features/applications/constants/application.constants";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

export interface ApplicationDashboardCounts {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  acceptedOffers: number;
  rejected: number;
  // Added for Phase 12 (Analytics) "Response Rate": "Applications with
  // status > Applied" - i.e. current_status is anything other than
  // Wishlist or Applied. Additive to this existing interface rather than a
  // second, parallel status-bucket-counting method, per "do NOT compute the
  // same metric twice in different Services."
  responded: number;
}

// ANALYTICS_ENGINE.md "Dashboard KPIs" - each count below matches that
// section's formula exactly. Sibling to ApplicationService/
// ApplicationStatusService/ApplicationNoteService (same file-per-sub-concern
// pattern established in Phases 9-10): this Service owns "what these counts
// mean", so the Dashboard (Phase 11) and, later, Analytics (Phase 12) both
// consume it instead of each recalculating their own version.
export const ApplicationStatsService = {
  async getDashboardCounts(
    userId: string
  ): Promise<ActionResult<ApplicationDashboardCounts>> {
    const [
      totalResult,
      interviewsResult,
      offersResult,
      acceptedResult,
      rejectedResult,
      unrespondedResult,
    ] = await Promise.all([
      ApplicationRepository.countByStatuses(userId),
      ApplicationRepository.countByStatuses(userId, INTERVIEW_STAGE_STATUSES),
      ApplicationRepository.countByStatuses(userId, OFFER_STAGE_STATUSES),
      ApplicationRepository.countByStatuses(userId, ["Accepted"]),
      ApplicationRepository.countByStatuses(userId, ["Rejected"]),
      ApplicationRepository.countByStatuses(userId, UNRESPONDED_STATUSES),
    ]);

    const results = [
      totalResult,
      interviewsResult,
      offersResult,
      acceptedResult,
      rejectedResult,
      unrespondedResult,
    ];
    if (results.some((result) => result.error)) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading dashboard statistics.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    const total = totalResult.count ?? 0;
    const acceptedOffers = acceptedResult.count ?? 0;
    const rejected = rejectedResult.count ?? 0;
    const unresponded = unrespondedResult.count ?? 0;

    return {
      success: true,
      data: {
        total,
        // "Active" (ANALYTICS_ENGINE.md: not in a final state) is derived
        // from counts already fetched above rather than a 6th query -
        // Accepted and Rejected are mutually exclusive (an application has
        // exactly one current_status), so this is exact, not an estimate.
        active: total - acceptedOffers - rejected,
        interviews: interviewsResult.count ?? 0,
        offers: offersResult.count ?? 0,
        acceptedOffers,
        rejected,
        // "Responded" (ANALYTICS_ENGINE.md Response Rate: "status > Applied")
        // = everything except Wishlist/Applied, derived the same way as
        // "active" above rather than a 7th query.
        responded: total - unresponded,
      },
    };
  },
};
