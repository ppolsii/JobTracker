import type { Database } from "@/types/supabase";

export type InterviewFeedback =
  Database["public"]["Tables"]["interview_feedback"]["Row"];

export type InterviewFormat = Database["public"]["Enums"]["interview_format"];
