import { ApplicationStatusHistoryRepository } from "@/features/applications/repositories/application-status-history.repository";
import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import {
  APPLICATION_STATUS_TRANSITIONS,
  needsApplicationDateForTransition,
} from "@/features/applications/constants/application.constants";
import type {
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
  ApplicationWithRelations,
} from "@/features/applications/types/application.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { normalize } from "@/shared/utils/normalize";
import type { ActionResult } from "@/types/action-result";

// Sibling to ApplicationService, mirroring the repository split already
// established in Phase 8 (ApplicationRepository vs.
// ApplicationStatusHistoryRepository): one file per sub-concern within the
// same feature, not a parallel "applications v2" pattern.
export const ApplicationStatusService = {
  // API.md "Get Status History". Re-verifies ownership via `findById` even
  // though RLS alone already fully protects this table (it has no user_id
  // column - RLS enforces ownership through an EXISTS subquery on
  // applications.user_id) - kept for the same "defense in depth" reason
  // every other repository call in this codebase re-filters by user_id.
  async listHistory(
    userId: string,
    applicationId: string
  ): Promise<ActionResult<ApplicationStatusHistoryEntry[]>> {
    const application = await ApplicationRepository.findById(
      userId,
      applicationId
    );
    if (!application.data) {
      return {
        success: false,
        error: {
          message: "Application not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    const { data, error } =
      await ApplicationStatusHistoryRepository.listByApplication(applicationId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading status history.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },

  // Bulk sibling of listHistory, backing AnalyticsService (Phase 12). No
  // per-application ownership re-check here (unlike listHistory): callers
  // always pass IDs already derived from a user-scoped fetch (e.g.
  // ApplicationService.listAllForAnalytics(userId)), never a client-supplied
  // ID - there is nothing left to verify.
  async listHistoryForApplications(
    applicationIds: string[]
  ): Promise<ActionResult<ApplicationStatusHistoryEntry[]>> {
    if (applicationIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } =
      await ApplicationStatusHistoryRepository.listByApplicationIds(
        applicationIds
      );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading status history.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },

  // BUSINESS_RULES.md "Allowed State Transitions" (APPLICATION_STATUS_TRANSITIONS
  // is the single source of truth) and "Status History": every change
  // creates a history record via ApplicationRepository.transitionStatus,
  // which the sync_current_status trigger (Phase 3) then reflects onto
  // applications.current_status automatically - this Service never writes
  // current_status directly (ADR-017).
  async changeStatus(
    userId: string,
    id: string,
    newStatus: ApplicationStatus,
    applicationDate?: string
  ): Promise<ActionResult<ApplicationWithRelations>> {
    const current = await ApplicationRepository.findById(userId, id);
    if (!current.data) {
      return {
        success: false,
        error: {
          message: "Application not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    const previousStatus = current.data.current_status;
    const allowedNext = APPLICATION_STATUS_TRANSITIONS[previousStatus] ?? [];
    if (!allowedNext.includes(newStatus)) {
      return {
        success: false,
        error: {
          message: `Cannot move from "${previousStatus}" to "${newStatus}".`,
          code: ERROR_CODES.VALIDATION_ERROR,
        },
      };
    }

    // DATABASE.md's applications_date_required_after_wishlist_check requires
    // application_date the moment current_status moves past Wishlist.
    // BUSINESS_RULES.md "Date Handling": "these dates must never be
    // inferred" - so a missing date blocks the transition instead of being
    // defaulted to today.
    let dateToApply: string | undefined;
    if (
      needsApplicationDateForTransition(
        previousStatus,
        current.data.application_date
      )
    ) {
      const date = normalize(applicationDate);
      if (!date) {
        return {
          success: false,
          error: {
            message:
              "Set an application date before moving this out of Wishlist.",
            code: ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }
      dateToApply = date;
    }

    // transition_application_status (Phase 20) writes the application_date
    // (when supplied) and the history row atomically - see that migration
    // for why. sync_current_status (Phase 3) still reflects the new status
    // onto applications.current_status automatically.
    const { error: transitionError } =
      await ApplicationRepository.transitionStatus(
        userId,
        id,
        previousStatus,
        newStatus,
        dateToApply
      );

    if (transitionError) {
      return {
        success: false,
        error: {
          message: "Something went wrong while updating the status.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    console.info(
      `Application ${id} transitioned ${previousStatus} -> ${newStatus} by user ${userId}.`
    );

    const updated = await ApplicationRepository.findById(userId, id);
    if (!updated.data) {
      return {
        success: false,
        error: {
          message: "Something went wrong after updating the status.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: updated.data };
  },
};
