import { createClient } from "@/lib/supabase/server";
import type {
  NoteExportRow,
  NoteSearchRow,
} from "@/features/applications/types/application.types";
import type { Database } from "@/types/supabase";

type ApplicationNoteInsert =
  Database["public"]["Tables"]["application_notes"]["Insert"];

const APPLICATION_NOTE_COLUMNS =
  "id, application_id, content, created_at, updated_at, deleted_at";

// Only this module may query the application_notes table (ADR-008). Unlike
// companies/cv_versions/applications, this table has no user_id column of
// its own - ownership is inherited entirely through application_id, so no
// query here can filter by user_id directly. ApplicationNoteService
// verifies ownership by going through ApplicationService first (see that
// file); RLS's EXISTS subquery against applications.user_id remains the
// actual, independent enforcement regardless of what the Service does.
export const ApplicationNoteRepository = {
  async create(payload: ApplicationNoteInsert) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .insert(payload)
      .select(APPLICATION_NOTE_COLUMNS)
      .single();
  },

  async findById(id: string) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .select(APPLICATION_NOTE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
  },

  // FEATURES.md Feature 11: "Unlimited notes" - no documented pagination, so
  // this returns the full set. Newest first: not specified by any document,
  // a reasonable default for a notes feed (most recent thought first).
  async listByApplication(applicationId: string) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .select(APPLICATION_NOTE_COLUMNS)
      .eq("application_id", applicationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
  },

  async update(id: string, content: string) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .update({ content })
      .eq("id", id)
      .is("deleted_at", null)
      .select(APPLICATION_NOTE_COLUMNS)
      .maybeSingle();
  },

  async archive(id: string) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select(APPLICATION_NOTE_COLUMNS)
      .maybeSingle();
  },

  // Phase 13 (Search) "Search notes". Bulk sibling of listByApplication,
  // scoped across ALL of a user's applications rather than one - this table
  // has no user_id of its own (see the ADR-008 note above), so ownership is
  // enforced the same way ApplicationRepository.listAllForAnalytics enforces
  // it for a joined table: an `!inner` join to applications plus a filter on
  // the joined column, not a second, parallel ownership mechanism. Archived
  // applications are excluded (`applications.deleted_at`) so a note never
  // surfaces for a job the user no longer considers active.
  async searchByContent(userId: string, query: string, limit: number) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .select(
        "id, application_id, content, applications!inner(user_id, position, deleted_at)"
      )
      .eq("applications.user_id", userId)
      .is("applications.deleted_at", null)
      .ilike("content", `%${query}%`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<NoteSearchRow[]>();
  },

  // Phase 14 (Export) "Export contains every user-owned entity". Same
  // ownership mechanism as searchByContent (an `!inner` join to applications
  // plus a filter on the joined column, since this table has no user_id of
  // its own) with no content filter and no limit - BUSINESS_RULES.md
  // "Notes": "Unlimited notes", and an export must never silently truncate
  // a user's own data. Its only caller is ExportService (never a list page
  // or picker), so - post-MVP technical debt resolution, KNOWN_ISSUES.md
  // "Phase 14 - Export" - this deliberately includes archived notes and
  // notes on archived applications too, unlike every other read in this
  // codebase: soft-delete never actually erases data, and "export all your
  // information" means all of it, not just what's currently active.
  async listAllForUser(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("application_notes")
      .select(
        "id, application_id, content, created_at, updated_at, applications!inner(user_id)"
      )
      .eq("applications.user_id", userId)
      .order("created_at", { ascending: false })
      .returns<NoteExportRow[]>();
  },
};
