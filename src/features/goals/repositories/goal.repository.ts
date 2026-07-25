import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];
type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];

const GOAL_COLUMNS =
  "id, user_id, metric, period, target_value, title, status, completed_at, created_at, updated_at, deleted_at";

// Only this module may query the goals table (ADR-008). Goals have their
// own user_id column (no ownership resolution through a join, unlike
// application_notes) - every query filters by it directly.
export const GoalRepository = {
  async create(payload: GoalInsert) {
    const supabase = await createClient();
    return supabase
      .from("goals")
      .insert(payload)
      .select(GOAL_COLUMNS)
      .single();
  },

  // Unpaginated bulk read - progress for every status (active/paused/
  // archived) is computed together so the Goals page can group them without
  // a second query per tab.
  async listAllForUser(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("goals")
      .select(GOAL_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
  },

  async update(userId: string, id: string, payload: GoalUpdate) {
    const supabase = await createClient();
    return supabase
      .from("goals")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(GOAL_COLUMNS)
      .maybeSingle();
  },

  // BUSINESS_RULES.md "Soft Deletes": archiving/deleting sets deleted_at;
  // no hard DELETE (no delete grant exists on this table at all). This is
  // the "Delete" action - distinct from `status = 'archived'`, which
  // `update` above already handles like any other status change.
  async softDelete(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("goals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(GOAL_COLUMNS)
      .maybeSingle();
  },
};
