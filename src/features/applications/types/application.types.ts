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

// The lean shape ApplicationRepository.listAllForAnalytics selects - only
// the columns AnalyticsService groups/aggregates by, not the full
// Application row (ANALYTICS_ENGINE.md "avoid loading unnecessary records").
export interface AnalyticsApplicationRow {
  id: string;
  company_id: string;
  cv_version_id: string;
  source: ApplicationSource | null;
  application_date: string | null;
  current_status: ApplicationStatus;
  companies: { name: string };
  cv_versions: { name: string };
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
