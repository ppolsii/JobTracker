import { InterviewFeedbackRepository } from "@/features/interview-feedback/repositories/interview-feedback.repository";
import type {
  InterviewFeedback,
  InterviewFormat,
} from "@/features/interview-feedback/types/interview-feedback.types";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER_V2.md Phase 30. Interview Feedback belongs to the
// Applications domain but lives in its own feature (per that phase's own
// file list), so - the same discipline every other cross-feature Service in
// this codebase already follows (AnalyticsService/SearchService only ever
// reach Applications through its Services, never its Repositories) - every
// operation here resolves ownership of the target application_status_history
// row via ApplicationStatusService.listHistory, which already re-verifies
// the application itself is owned by this user. InterviewFeedbackRepository
// never queries application_status_history or applications directly.
interface InterviewFeedbackInput {
  rating?: number;
  format?: InterviewFormat;
  notes: string;
}

export const InterviewFeedbackService = {
  // Backs the Application Detail page: every status-history row's feedback,
  // in one query, keyed by application_status_history_id by the caller.
  async listForApplication(
    userId: string,
    applicationId: string
  ): Promise<ActionResult<InterviewFeedback[]>> {
    const history = await ApplicationStatusService.listHistory(
      userId,
      applicationId
    );
    if (!history.success) return history;

    const historyIds = history.data.map((entry) => entry.id);
    if (historyIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await InterviewFeedbackRepository.listByHistoryIds(
      userId,
      historyIds
    );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading interview feedback.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },

  // BUSINESS_RULES.md "Interview Feedback": ownership of the target status-
  // history entry is confirmed by checking it appears in this application's
  // own history - append-only, so any number of feedback entries may exist
  // per stage.
  async create(
    userId: string,
    applicationId: string,
    applicationStatusHistoryId: string,
    input: InterviewFeedbackInput
  ): Promise<ActionResult<InterviewFeedback>> {
    const history = await ApplicationStatusService.listHistory(
      userId,
      applicationId
    );
    if (!history.success) return history;

    const entry = history.data.find(
      (candidate) => candidate.id === applicationStatusHistoryId
    );
    if (!entry) {
      return {
        success: false,
        error: {
          message: "Status history entry not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    const { data, error } = await InterviewFeedbackRepository.create({
      application_status_history_id: applicationStatusHistoryId,
      user_id: userId,
      rating: input.rating ?? null,
      format: input.format ?? null,
      notes: input.notes.trim(),
    });

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while saving interview feedback.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  // Ownership is enforced by InterviewFeedbackRepository.update filtering on
  // user_id directly (interview_feedback has its own user_id column, unlike
  // application_notes) - no separate resolve-then-check step is needed here.
  async update(
    userId: string,
    id: string,
    input: InterviewFeedbackInput
  ): Promise<ActionResult<InterviewFeedback>> {
    const { data, error } = await InterviewFeedbackRepository.update(
      userId,
      id,
      {
        rating: input.rating ?? null,
        format: input.format ?? null,
        notes: input.notes.trim(),
      }
    );

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Interview feedback not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    return { success: true, data };
  },

  // BUSINESS_RULES.md "Soft Deletes": archiving sets deleted_at; no hard
  // DELETE (interview_feedback has no DELETE grant/RLS policy at all,
  // matching every other business entity in this project).
  async archive(
    userId: string,
    id: string
  ): Promise<ActionResult<InterviewFeedback>> {
    const { data, error } = await InterviewFeedbackRepository.archive(
      userId,
      id
    );

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Interview feedback not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    console.info(`Interview feedback ${id} archived by user ${userId}.`);
    return { success: true, data };
  },
};
