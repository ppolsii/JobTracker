import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type CalendarEventInsert =
  Database["public"]["Tables"]["calendar_events"]["Insert"];
type CalendarEventUpdate =
  Database["public"]["Tables"]["calendar_events"]["Update"];

const CALENDAR_EVENT_COLUMNS =
  "id, user_id, application_id, type, title, description, event_date, created_at, updated_at, deleted_at";

// Only this module may query the calendar_events table (ADR-008). Like
// interview_feedback (Phase 30), this table has its own user_id column, so
// every query filters by it directly rather than resolving ownership
// through a join.
export const CalendarEventRepository = {
  async create(payload: CalendarEventInsert) {
    const supabase = await createClient();
    return supabase
      .from("calendar_events")
      .insert(payload)
      .select(CALENDAR_EVENT_COLUMNS)
      .single();
  },

  // Unpaginated bulk read backing the Calendar page - the same "whole
  // account, computed in application code" shape every other Calendar data
  // source already uses (applications, status history, notes, feedback).
  async listAllForUser(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("calendar_events")
      .select(CALENDAR_EVENT_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("event_date", { ascending: true });
  },

  async update(userId: string, id: string, payload: CalendarEventUpdate) {
    const supabase = await createClient();
    return supabase
      .from("calendar_events")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(CALENDAR_EVENT_COLUMNS)
      .maybeSingle();
  },

  async archive(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("calendar_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(CALENDAR_EVENT_COLUMNS)
      .maybeSingle();
  },
};
