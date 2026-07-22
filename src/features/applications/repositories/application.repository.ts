import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CURRENCY } from "@/features/applications/constants/application.constants";
import type { ApplicationSortBy } from "@/features/applications/constants/application.constants";
import type {
  AnalyticsApplicationRow,
  ApplicationSource,
  ApplicationStatus,
  ApplicationWithRelations,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";
import type { Database } from "@/types/supabase";

type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];
type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];

const APPLICATION_COLUMNS =
  "id, user_id, company_id, cv_version_id, position, job_url, location, work_mode, employment_type, source, salary_min, salary_max, currency, application_date, current_status, response_date, offer_salary, rejection_reason, created_at, updated_at, deleted_at";

// `!inner` is safe here (not a behavior change): company_id/cv_version_id are
// NOT NULL and FK-constrained, so every application always has exactly one
// matching companies/cv_versions row. `!inner` is what makes `.order(...,
// { referencedTable })` actually reorder the parent rows (see
// ApplicationRepository.list) rather than only ordering within each row.
const APPLICATION_LIST_COLUMNS = `${APPLICATION_COLUMNS}, companies!inner(name), cv_versions!inner(name)`;

// Field names match listApplicationsSchema's output exactly (itself matching
// the applications table's own column names), so the parsed searchParams
// object can be passed straight through from the page with no translation
// layer - the same minimal-transformation approach Companies/CV Versions use.
export interface ApplicationListParams {
  query?: string;
  status?: ApplicationStatus;
  company_id?: string;
  cv_version_id?: string;
  source?: ApplicationSource;
  work_mode?: WorkMode;
  employment_type?: EmploymentType;
  date_from?: string;
  date_to?: string;
  salary_min?: number;
  salary_max?: number;
  sort_by: ApplicationSortBy;
  sort_dir: "asc" | "desc";
  page: number;
  limit: number;
}

// Only this module may query the applications table (ADR-008). Every query
// filters by user_id in addition to RLS, as defense in depth.
export const ApplicationRepository = {
  // Calls create_application_with_genesis (Phase 20) instead of a plain
  // insert, so the application row and its genesis status-history row are
  // written atomically - see that migration for why. RLS still governs both
  // writes exactly as it did for the two separate calls this replaced.
  async create(payload: ApplicationInsert) {
    const supabase = await createClient();
    return supabase.rpc("create_application_with_genesis", {
      p_user_id: payload.user_id,
      p_company_id: payload.company_id,
      p_cv_version_id: payload.cv_version_id,
      p_position: payload.position,
      p_application_date: payload.application_date ?? null,
      p_job_url: payload.job_url ?? null,
      p_location: payload.location ?? null,
      p_work_mode: payload.work_mode ?? null,
      p_employment_type: payload.employment_type ?? null,
      p_source: payload.source ?? null,
      p_salary_min: payload.salary_min ?? null,
      p_salary_max: payload.salary_max ?? null,
      p_currency: payload.currency ?? DEFAULT_CURRENCY,
    });
  },

  // Backs both the "General Information" section of the Application Detail
  // page (Phase 9) and ApplicationStatusService's current-status/ownership
  // check before a transition - same embedded-relations shape as `list` so
  // the detail page can show company/CV names without a second query.
  async findById(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .select(APPLICATION_LIST_COLUMNS)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
      .returns<ApplicationWithRelations>();
  },

  async update(userId: string, id: string, payload: ApplicationUpdate) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(APPLICATION_COLUMNS)
      .maybeSingle();
  },

  // Calls transition_application_status (Phase 20) instead of a separate
  // date update followed by a separate history insert, so both writes
  // happen atomically - see that migration for why. Called only from
  // ApplicationStatusService.changeStatus, after that Service has already
  // validated the transition is allowed and resolved whether a date is
  // required; this method makes no decision of its own.
  async transitionStatus(
    userId: string,
    applicationId: string,
    previousStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
    applicationDate?: string
  ) {
    const supabase = await createClient();
    return supabase.rpc("transition_application_status", {
      p_user_id: userId,
      p_application_id: applicationId,
      p_previous_status: previousStatus,
      p_new_status: newStatus,
      p_application_date: applicationDate ?? null,
    });
  },

  async archive(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(APPLICATION_COLUMNS)
      .maybeSingle();
  },

  // IMPLEMENTATION_ORDER_V2.md Phase 26. Unlike Companies/CV Versions,
  // applications have no uniqueness rule to re-validate (BUSINESS_RULES.md
  // "Duplicate Applications": duplicates are allowed) - a plain restore.
  async restore(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .update({ deleted_at: null })
      .eq("user_id", userId)
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select(APPLICATION_COLUMNS)
      .maybeSingle();
  },

  // Paginated sibling of `list`, filtered to archived rows only - backs the
  // Archived view a user restores from. No filters/sort beyond pagination,
  // matching the same simplicity Companies/CV Versions' Archived view uses.
  async listArchived(
    userId: string,
    { page, limit }: { page: number; limit: number }
  ) {
    const supabase = await createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return supabase
      .from("applications")
      .select(APPLICATION_LIST_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("updated_at", { ascending: false })
      .range(from, to)
      .returns<ApplicationWithRelations[]>();
  },

  // Generic, mechanical count primitive - which statuses constitute "Active",
  // "Interviews", etc. is an ANALYTICS_ENGINE.md-defined business decision
  // that belongs in a Service (ApplicationStatsService), not here. Omitting
  // `statuses` (or passing an empty array) returns the unfiltered total.
  async countByStatuses(userId: string, statuses?: ApplicationStatus[]) {
    const supabase = await createClient();
    let builder = supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (statuses && statuses.length > 0) {
      builder = builder.in("current_status", statuses);
    }

    return builder;
  },

  // ANALYTICS_ENGINE.md requires grouping/aggregating across a user's ENTIRE
  // application history (e.g. "Interview Rate per CV Version"), which
  // PostgREST's REST interface cannot express as a single GROUP BY query
  // without a bespoke Postgres view/function (DATABASE.md defers views to
  // "future versions"). This is therefore a single, deliberately lean bulk
  // fetch (only the columns analytics actually groups/aggregates by - no
  // job_url, salary, notes-adjacent columns, etc.) that AnalyticsService
  // aggregates in application code - the documented, explained exception to
  // "prefer SQL aggregation" (ANALYTICS_ENGINE.md "Performance Requirements")
  // given the stack's actual constraints. Unpaginated by design: analytics
  // must see the whole dataset, unlike `list`'s page-at-a-time contract.
  async listAllForAnalytics(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .select(
        "id, company_id, cv_version_id, source, application_date, current_status, companies!inner(name), cv_versions!inner(name)"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .returns<AnalyticsApplicationRow[]>();
  },

  // Search (BUSINESS_RULES.md "Search"): Position only in Phase 8 - see
  // CHANGELOG "Deviations" for why free-text Company-name search is deferred.
  // Company/CV Version remain available as exact-match filters below.
  // Salary range filter: standard interval-overlap semantics - an
  // application matches `salary_min` if its own range reaches at least that
  // amount (`salary_max >= salary_min`), and matches `salary_max` if its own
  // range stays at or below that amount (`salary_min <= salary_max`).
  async list(userId: string, params: ApplicationListParams) {
    const supabase = await createClient();
    let builder = supabase
      .from("applications")
      .select(APPLICATION_LIST_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (params.query) {
      builder = builder.ilike("position", `%${params.query}%`);
    }
    if (params.status) builder = builder.eq("current_status", params.status);
    if (params.company_id) {
      builder = builder.eq("company_id", params.company_id);
    }
    if (params.cv_version_id) {
      builder = builder.eq("cv_version_id", params.cv_version_id);
    }
    if (params.source) builder = builder.eq("source", params.source);
    if (params.work_mode) builder = builder.eq("work_mode", params.work_mode);
    if (params.employment_type) {
      builder = builder.eq("employment_type", params.employment_type);
    }
    if (params.date_from) {
      builder = builder.gte("application_date", params.date_from);
    }
    if (params.date_to) {
      builder = builder.lte("application_date", params.date_to);
    }
    if (params.salary_min !== undefined) {
      builder = builder.gte("salary_max", params.salary_min);
    }
    if (params.salary_max !== undefined) {
      builder = builder.lte("salary_min", params.salary_max);
    }

    const ascending = params.sort_dir === "asc";
    builder =
      params.sort_by === "company"
        ? builder.order("name", { ascending, referencedTable: "companies" })
        : builder.order(params.sort_by, { ascending });

    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;

    return builder.range(from, to).returns<ApplicationWithRelations[]>();
  },

  // Post-MVP technical debt resolution (KNOWN_ISSUES.md "Phase 14 -
  // Export") - same reasoning as CompanyRepository/CVVersionRepository's
  // sibling method: `list` correctly excludes archived applications for
  // every other caller (the list page, pickers, Search, Dashboard), but
  // Export's "export all your information" needs them too. Full row +
  // relations (Export needs every stored column, unlike the lean
  // `listAllForAnalytics` projection), no pagination, no status/date/salary
  // filters - this is "everything," not a filtered view.
  async listAllIncludingArchived(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("applications")
      .select(APPLICATION_LIST_COLUMNS)
      .eq("user_id", userId)
      .order("application_date", { ascending: false })
      .returns<ApplicationWithRelations[]>();
  },
};
