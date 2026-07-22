import { z } from "zod";

import {
  INTERVIEW_FORMAT_OPTIONS,
  MAX_RATING,
  MIN_RATING,
} from "@/features/interview-feedback/constants/interview-feedback.constants";

// Mirrors application_notes' content field (BUSINESS_RULES.md "Notes"):
// required, free text, Markdown supported. 10,000 chars matches
// createApplicationNoteSchema's own bound.
const feedbackNotesField = z
  .string()
  .trim()
  .min(1, "Feedback notes are required.")
  .max(10000, "Feedback is too long.");

// Both optional: a user may rate without naming a format, or vice versa, or
// leave both unset and only write notes.
const feedbackRatingField = z.coerce
  .number()
  .int()
  .min(MIN_RATING, `Rating must be between ${MIN_RATING} and ${MAX_RATING}.`)
  .max(MAX_RATING, `Rating must be between ${MIN_RATING} and ${MAX_RATING}.`)
  .optional();

const feedbackFormatField = z.enum(INTERVIEW_FORMAT_OPTIONS).optional();

export const createInterviewFeedbackSchema = z.object({
  application_id: z.string().uuid(),
  application_status_history_id: z.string().uuid(),
  rating: feedbackRatingField,
  format: feedbackFormatField,
  notes: feedbackNotesField,
});
export type CreateInterviewFeedbackInput = z.infer<
  typeof createInterviewFeedbackSchema
>;

// `application_id` is not part of the update itself (ownership is enforced
// by InterviewFeedbackRepository filtering on user_id, not by re-deriving
// the application) - it is carried only so the Server Action can revalidate
// the right Application Detail page, since an interview_feedback row (unlike
// an application_notes row) has no application_id column of its own to read
// back after the update.
export const updateInterviewFeedbackSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  rating: feedbackRatingField,
  format: feedbackFormatField,
  notes: feedbackNotesField,
});
export type UpdateInterviewFeedbackInput = z.infer<
  typeof updateInterviewFeedbackSchema
>;

export const archiveInterviewFeedbackSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
});
export type ArchiveInterviewFeedbackInput = z.infer<
  typeof archiveInterviewFeedbackSchema
>;
