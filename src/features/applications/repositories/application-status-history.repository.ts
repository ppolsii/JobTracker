import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/features/applications/types/application.types";

// Phase 8 seeded this repository with only the "genesis" row every
// application needs the moment it's created. Phase 9 (Status Tracking)
// extends it here with the transition insert and the history read, per the
// Phase 8 CHANGELOG's stated intent, rather than introducing a parallel
// repository for the same table.
export const ApplicationStatusHistoryRepository = {
  // BUSINESS_RULES.md "Status History": "Every status change must generate
  // a history record". Called only from ApplicationService.create.
  async createGenesis(userId: string, applicationId: string) {
    const supabase = await createClient();
    return supabase.from("application_status_history").insert({
      application_id: applicationId,
      previous_status: null,
      new_status: "Wishlist",
      created_by: userId,
    });
  },

  // Called only from ApplicationStatusService.changeStatus, after that
  // Service has already validated the transition is allowed. A separate,
  // narrowly-named method rather than generalizing `createGenesis` into one
  // generic `create` - consistent with this codebase's existing repository
  // style (e.g. CompanyRepository.archive is its own method, not a generic
  // update variant) and avoids touching Phase 8 code without a bug to fix.
  async createTransition(
    userId: string,
    applicationId: string,
    previousStatus: ApplicationStatus,
    newStatus: ApplicationStatus
  ) {
    const supabase = await createClient();
    return supabase.from("application_status_history").insert({
      application_id: applicationId,
      previous_status: previousStatus,
      new_status: newStatus,
      created_by: userId,
    });
  },

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
