import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

const COMPANY_COLUMNS =
  "id, user_id, name, website, industry, size, country, city, created_at, updated_at, deleted_at";

// Only this module may query the companies table (ADR-008). Every query
// filters by user_id in addition to RLS, as defense in depth.
export const CompanyRepository = {
  async create(payload: CompanyInsert) {
    const supabase = await createClient();
    return supabase
      .from("companies")
      .insert(payload)
      .select(COMPANY_COLUMNS)
      .single();
  },

  async findActiveByName(userId: string, name: string) {
    const supabase = await createClient();
    return supabase
      .from("companies")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", name)
      .is("deleted_at", null)
      .maybeSingle();
  },

  // Used by ApplicationService to validate a company_id before an
  // application references it (owned by this user, not archived) - a
  // plain FK only guarantees the row exists, not that it's still active.
  async findActiveById(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
  },

  async list(
    userId: string,
    { query, page, limit }: { query?: string; page: number; limit: number }
  ) {
    const supabase = await createClient();
    let builder = supabase
      .from("companies")
      .select(COMPANY_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (query) {
      builder = builder.ilike("name", `%${query}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return builder.order("name", { ascending: true }).range(from, to);
  },

  async update(userId: string, id: string, payload: CompanyUpdate) {
    const supabase = await createClient();
    return supabase
      .from("companies")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(COMPANY_COLUMNS)
      .maybeSingle();
  },

  async archive(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("companies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(COMPANY_COLUMNS)
      .maybeSingle();
  },

  // Used by CompanyService to enforce BUSINESS_RULES.md: "A company cannot
  // be deleted if applications reference it."
  async countActiveApplications(userId: string, companyId: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .is("deleted_at", null);
  },

  // Post-MVP technical debt resolution (KNOWN_ISSUES.md "Phase 14 - Export"):
  // `list` deliberately excludes archived companies for every existing
  // caller (list pages, pickers, search) - correct there, but Export's own
  // "export all your information" (BUSINESS_RULES.md) needs archived rows
  // too, since soft-delete never actually erases data. A separate method
  // keeps that one exception isolated to Export instead of adding an
  // `includeArchived` branch to the widely-used `list`. No pagination,
  // matching every other Export bulk-read in this codebase.
  async listAllIncludingArchived(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .eq("user_id", userId)
      .order("name", { ascending: true });
  },
};
