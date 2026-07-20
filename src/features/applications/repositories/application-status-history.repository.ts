import { createClient } from "@/lib/supabase/server";

// Both writes into application_status_history (the genesis row on
// application creation, the transition row on a status change) now happen
// atomically together with their companion applications write, via the
// create_application_with_genesis / transition_application_status RPCs
// (Phase 20 - see ApplicationRepository and that migration). This
// repository is read-only as a result; it no longer has an insert method of
// its own.
export const ApplicationStatusHistoryRepository = {
  // API.md "Get Status History": "Returns complete status history. Ordered
  // by changed_at ascending." No explicit user_id filter here - this table
  // has no user_id column of its own; ownership is enforced by RLS's EXISTS
  // subquery against applications.user_id, and in practice every caller
  // (the Application Detail page) already gates on ownership via
  // ApplicationService.getById before ever reaching this query.
  async listByApplication(applicationId: string) {
    const supabase = await createClient();
    return supabase
      .from("application_status_history")
      .select(
        "id, application_id, previous_status, new_status, changed_at, created_by"
      )
      .eq("application_id", applicationId)
      .order("changed_at", { ascending: true });
  },

  // Bulk sibling of listByApplication - backs AnalyticsService (Phase 12),
  // which needs every transition across ALL of a user's applications (to
  // compute Average Response Time and Funnel Analytics) in one query rather
  // than one query per application.
  async listByApplicationIds(applicationIds: string[]) {
    const supabase = await createClient();
    return supabase
      .from("application_status_history")
      .select(
        "id, application_id, previous_status, new_status, changed_at, created_by"
      )
      .in("application_id", applicationIds)
      .order("changed_at", { ascending: true });
  },
};
