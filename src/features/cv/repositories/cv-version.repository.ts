import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type CVVersionInsert = Database["public"]["Tables"]["cv_versions"]["Insert"];
type CVVersionUpdate = Database["public"]["Tables"]["cv_versions"]["Update"];

const CV_VERSION_COLUMNS =
  "id, user_id, name, description, created_at, updated_at, deleted_at";

// Only this module may query the cv_versions table (ADR-008). Every query
// filters by user_id in addition to RLS, as defense in depth.
export const CVVersionRepository = {
  async create(payload: CVVersionInsert) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .insert(payload)
      .select(CV_VERSION_COLUMNS)
      .single();
  },

  async findActiveByName(userId: string, name: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", name)
      .is("deleted_at", null)
      .maybeSingle();
  },

  // Used by ApplicationService to validate a cv_version_id before an
  // application references it (owned by this user, not archived) - a
  // plain FK only guarantees the row exists, not that it's still active.
  async findActiveById(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .select("id, name")
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
  },

  async list(userId: string, { page, limit }: { page: number; limit: number }) {
    const supabase = await createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return supabase
      .from("cv_versions")
      .select(CV_VERSION_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);
  },

  async update(userId: string, id: string, payload: CVVersionUpdate) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(CV_VERSION_COLUMNS)
      .maybeSingle();
  },

  async archive(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(CV_VERSION_COLUMNS)
      .maybeSingle();
  },

  // Used by CVVersionService to enforce BUSINESS_RULES.md "CV Rules": "A CV
  // version cannot be deleted while applications reference it."
  async countActiveApplications(userId: string, cvVersionId: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("cv_version_id", cvVersionId)
      .is("deleted_at", null);
  },

  // Post-MVP technical debt resolution (KNOWN_ISSUES.md "Phase 14 -
  // Export") - mirrors CompanyRepository.listAllIncludingArchived exactly,
  // for the same reason: Export needs archived rows too, isolated from
  // `list` (whose every other caller correctly wants active-only).
  async listAllIncludingArchived(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .select(CV_VERSION_COLUMNS)
      .eq("user_id", userId)
      .order("name", { ascending: true });
  },
};
