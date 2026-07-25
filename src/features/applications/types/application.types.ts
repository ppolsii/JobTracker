import type { Database } from "@/types/supabase";

export type Application = Database["public"]["Tables"]["applications"]["Row"];

export type WorkMode = Database["public"]["Enums"]["work_mode"];
export type EmploymentType = Database["public"]["Enums"]["employment_type"];
export type ApplicationStatus =
  Database["public"]["Enums"]["application_status"];
export type ApplicationSource =
  Database["public"]["Enums"]["application_source"];

// Joined display data (company/CV version names) alongside the application's
// own columns - what the list page renders. Kept separate from `Application`
// (the raw Row type) since it's shaped by ApplicationRepository.list's query,
// not the table itself.
export interface ApplicationWithRelations extends Application {
  companies: { name: string } | null;
  cv_versions: { name: string } | null;
}

export type ApplicationStatusHistoryEntry =
  Database["public"]["Tables"]["application_status_history"]["Row"];

export type ApplicationNote =
  Database["public"]["Tables"]["application_notes"]["Row"];

// The lean shape ApplicationRepository.listAllForAnalytics selects - only a
// bounded set of columns, not the full Application row (ANALYTICS_ENGINE.md
// "avoid loading unnecessary records"). Originally Analytics-only (Phase 12)
// but reused as-is by every later feature needing "bulk lean data about
// every active application" (Advanced Analytics' Salary section added
// salary fields in Phase 33; Calendar reuses the whole row plus `position`
// in Phase 34) - one shared, evolving projection, not a parallel one per
// consumer.
export interface AnalyticsApplicationRow {
  id: string;
  company_id: string;
  cv_version_id: string;
  // IMPLEMENTATION_ORDER_V2.md Phase 34 (Calendar & Timeline): the Calendar
  // and its search need the position, which no earlier consumer of this
  // projection did.
  position: string;
  source: ApplicationSource | null;
  // IMPLEMENTATION_ORDER_V2.md Phase 29: Work Mode/Employment Type Analytics
  // group by these two columns - no statistics view carries them (DATABASE.md
  // reserves no `work_mode_statistics`/`employment_type_statistics` name), so
  // they're added to the same bulk analytics projection Source Analytics
  // already groups by in application code.
  work_mode: WorkMode | null;
  employment_type: EmploymentType | null;
  application_date: string | null;
  current_status: ApplicationStatus;
  companies: { name: string };
  cv_versions: { name: string };
  // IMPLEMENTATION_ORDER_V2.md Phase 33 (Advanced Analytics) "Salary":
  // nullable - "Missing salary data must never break analytics" - every
  // salary calculation must treat these as optional.
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
}

// The lean shape ApplicationNoteRepository.searchByContent selects - only
// what Phase 13 (Search) needs to display a result row and link back to its
// parent application, not the full note (same "no unnecessary records"
// reasoning as AnalyticsApplicationRow above).
export interface NoteSearchRow {
  id: string;
  application_id: string;
  content: string;
  applications: { position: string } | null;
}

// The shape ApplicationNoteRepository.listAllForUser selects for Phase 14
// (Export) - every note field a "faithfully represent the user's data"
// export needs, deliberately excluding the `applications` join used only to
// enforce ownership (see that method's comment) since it isn't part of the
// note itself.
export interface NoteExportRow {
  id: string;
  application_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
