import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type InterviewFeedbackInsert =
  Database["public"]["Tables"]["interview_feedback"]["Insert"];
type InterviewFeedbackUpdate =
  Database["public"]["Tables"]["interview_feedback"]["Update"];

const INTERVIEW_FEEDBACK_COLUMNS =
  "id, application_status_history_id, user_id, rating, format, notes, created_at, updated_at, deleted_at";

// Only this module may query the interview_feedback table (ADR-008). Unlike
// application_notes, this table has its own user_id column (approved during
// Phase 30 planning), so every query here filters by it directly - the same
// shape ApplicationRepository/CompanyRepository already use - rather than
// resolving ownership through a join. InterviewFeedbackService still
// verifies the target application_status_history_id belongs to an
// application owned by this user before ever calling `create` (see that
// file), since RLS's own insert/update policies additionally enforce this
// same rule independently.
export const InterviewFeedbackRepository = {
  async create(payload: InterviewFeedbackInsert) {
    const supabase = await createClient();
    return supabase
      .from("interview_feedback")
      .insert(payload)
      .select(INTERVIEW_FEEDBACK_COLUMNS)
      .single();
  },

  // Bulk read backing the Application Detail page's status timeline - one
  // query for every status-history row's feedback, not one query per row.
  async listByHistoryIds(userId: string, historyIds: string[]) {
    const supabase = await createClient();
    return supabase
      .from("interview_feedback")
      .select(INTERVIEW_FEEDBACK_COLUMNS)
      .eq("user_id", userId)
      .in("application_status_history_id", historyIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
  },

  async update(userId: string, id: string, payload: InterviewFeedbackUpdate) {
    const supabase = await createClient();
    return supabase
      .from("interview_feedback")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(INTERVIEW_FEEDBACK_COLUMNS)
      .maybeSingle();
  },

  async archive(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("interview_feedback")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(INTERVIEW_FEEDBACK_COLUMNS)
      .maybeSingle();
  },
};
