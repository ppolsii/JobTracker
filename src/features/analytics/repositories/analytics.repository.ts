import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

// Wide, per-status-count row shape shared by all four Phase 21 views
// (DATABASE.md "Views") - one row per group (or a single row for
// dashboard_metrics), enumerating every application_status exhaustively.
// The views perform no categorisation of their own; AnalyticsService sums
// whichever subset of these columns a given metric needs, using the same
// INTERVIEW_STAGE_STATUSES/OFFER_STAGE_STATUSES/UNRESPONDED_STATUSES
// constants it already used before this phase (see analytics-calculations.ts).
//
// Derived from the generated `Database` type (never hand-copied) so this
// stays correct automatically after every `supabase gen types` regeneration.
// Every field here is nullable - not because the underlying counts can
// truly be missing (`count(*) filter (...)` never returns null), but
// because Postgres view columns carry no NOT NULL guarantee the type
// generator can prove statically, so it conservatively types every column
// of every view as `T | null`. analytics-calculations.ts's
// sumStatusCounts/computeGroupAnalyticsFromStatistics/deriveOverviewCounts
// coalesce that to `0` at the one place it matters, rather than assuming
// non-null here and letting a future regeneration silently break again.
export type StatusCountColumns = Omit<
  Database["public"]["Views"]["dashboard_metrics"]["Row"],
  "user_id"
>;

// company_statistics/cv_statistics/monthly_statistics all share this exact
// shape (DATABASE.md "Views") - one canonical alias rather than three
// identical ones.
export type GroupStatisticsRow =
  Database["public"]["Views"]["company_statistics"]["Row"];

const STATUS_COUNT_COLUMNS =
  "wishlist_count, applied_count, recruiter_contact_count, hr_interview_count, technical_interview_count, final_interview_count, offer_count, accepted_count, rejected_count, total_count";

// Only this module may query these views (ADR-008's "one repository per
// table" convention extended to views). Every query filters by user_id in
// addition to each view's own RLS (security_invoker) - the same defense in
// depth every other repository in this codebase already applies.
export const AnalyticsRepository = {
  // Backs AnalyticsService's Overview (Response/Interview/Offer Rate) -
  // returns no row at all when the user has no applications, same as any
  // other GROUP BY over zero matching rows.
  async getDashboardMetrics(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("dashboard_metrics")
      .select(`user_id, ${STATUS_COUNT_COLUMNS}`)
      .eq("user_id", userId)
      .maybeSingle();
  },

  async getCompanyStatistics(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("company_statistics")
      .select(`user_id, id, name, ${STATUS_COUNT_COLUMNS}`)
      .eq("user_id", userId);
  },

  async getCvStatistics(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_statistics")
      .select(`user_id, id, name, ${STATUS_COUNT_COLUMNS}`)
      .eq("user_id", userId);
  },

  async getMonthlyStatistics(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("monthly_statistics")
      .select(`user_id, id, name, ${STATUS_COUNT_COLUMNS}`)
      .eq("user_id", userId);
  },
};
