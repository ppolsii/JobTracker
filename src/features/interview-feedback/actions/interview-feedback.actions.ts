"use server";

import { revalidatePath } from "next/cache";

import { applicationDetailRoute } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  archiveInterviewFeedbackSchema,
  createInterviewFeedbackSchema,
  updateInterviewFeedbackSchema,
} from "@/features/interview-feedback/schemas/interview-feedback.schema";
import { InterviewFeedbackService } from "@/features/interview-feedback/services/interview-feedback.service";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createInterviewFeedbackAction(
  input: unknown
): Promise<ActionResult<InterviewFeedback>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createInterviewFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await InterviewFeedbackService.create(
    auth.data,
    parsed.data.application_id,
    parsed.data.application_status_history_id,
    {
      rating: parsed.data.rating,
      format: parsed.data.format,
      notes: parsed.data.notes,
    }
  );
  if (result.success) {
    revalidatePath(applicationDetailRoute(parsed.data.application_id));
  }
  return result;
}

export async function updateInterviewFeedbackAction(
  input: unknown
): Promise<ActionResult<InterviewFeedback>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateInterviewFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await InterviewFeedbackService.update(auth.data, parsed.data.id, {
    rating: parsed.data.rating,
    format: parsed.data.format,
    notes: parsed.data.notes,
  });
  if (result.success) {
    revalidatePath(applicationDetailRoute(parsed.data.application_id));
  }
  return result;
}

export async function archiveInterviewFeedbackAction(
  input: unknown
): Promise<ActionResult<InterviewFeedback>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = archiveInterviewFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await InterviewFeedbackService.archive(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(applicationDetailRoute(parsed.data.application_id));
  }
  return result;
}
