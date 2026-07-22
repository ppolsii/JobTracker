import type { InterviewFormat } from "@/features/interview-feedback/types/interview-feedback.types";

// IMPLEMENTATION_ORDER_V2.md Phase 30: no document defines the format enum's
// values - approved by the user during Phase 30 planning as the interview's
// delivery mode (independent of the application's own work_mode).
export const INTERVIEW_FORMAT_OPTIONS: InterviewFormat[] = [
  "Phone",
  "Video",
  "On-site",
  "Technical",
  "Behavioral",
];

// 1-5 scale, approved by the user during Phase 30 planning (no document
// defined a scale for the `rating` column).
export const MIN_RATING = 1;
export const MAX_RATING = 5;
