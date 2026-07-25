import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type CVVersionInsert = Database["public"]["Tables"]["cv_versions"]["Insert"];
type CVVersionUpdate = Database["public"]["Tables"]["cv_versions"]["Update"];

const CV_VERSION_COLUMNS =
  "id, user_id, name, description, file_path, file_name, file_size, uploaded_at, created_at, updated_at, deleted_at";

// Phase 40 (CV Library): every CV file lives in the private `cv-files`
// bucket (supabase/migrations/20260726090000_cv_file_storage.sql) under a
// deterministic "<user_id>/<cv_version_id>.pdf" key - never a client-chosen
// path - so storage.objects' RLS policy (keyed on that same leading
// <user_id> segment) is the real enforcement, matching every other table's
// "user_id = auth.uid()" policy in this project.
const CV_FILE_BUCKET = "cv-files";

function cvFilePath(userId: string, cvVersionId: string): string {
  return `${userId}/${cvVersionId}.pdf`;
}

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

  // IMPLEMENTATION_ORDER_V2.md Phase 26. The partial unique index on
  // (user_id, lower(name)) WHERE deleted_at IS NULL is the real enforcement
  // against restoring into a name conflict - CVVersionService maps the
  // resulting 23505 the same way create/update already do.
  async restore(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .update({ deleted_at: null })
      .eq("user_id", userId)
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select(CV_VERSION_COLUMNS)
      .maybeSingle();
  },

  // Paginated sibling of `list`, filtered to archived rows only - backs the
  // Archived view a user restores from.
  async listArchived(
    userId: string,
    { page, limit }: { page: number; limit: number }
  ) {
    const supabase = await createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return supabase
      .from("cv_versions")
      .select(CV_VERSION_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("updated_at", { ascending: false })
      .range(from, to);
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

  // Phase 40 (CV Library): downloading an archived CV version's file must
  // still work (the row is only hidden from active lists, never actually
  // gone - same as every other archived entity), so this deliberately does
  // NOT filter on deleted_at, unlike findActiveById above.
  async findFileById(userId: string, id: string) {
    const supabase = await createClient();
    return supabase
      .from("cv_versions")
      .select("file_path, file_name")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
  },

  // Uploads (or, with upsert, overwrites) the PDF for one CV version. The
  // path is always derived server-side from userId/cvVersionId - the caller
  // never supplies it - so it always lands inside that user's own folder,
  // which storage.objects' RLS policy independently enforces as well.
  async uploadFile(userId: string, cvVersionId: string, file: File) {
    const supabase = await createClient();
    const path = cvFilePath(userId, cvVersionId);
    const { error } = await supabase.storage
      .from(CV_FILE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    return { path, error };
  },

  // Cleans up a just-uploaded file when the CV version row it belongs to
  // failed to get created (e.g. a concurrent duplicate name) - the file was
  // never associated with any row the user could see, so removing it here
  // is infrastructure cleanup, not user-facing deletion (ARCHITECTURE.md's
  // soft-delete-only rule governs rows, not an orphaned upload that predates
  // any row existing).
  async removeFile(path: string) {
    const supabase = await createClient();
    return supabase.storage.from(CV_FILE_BUCKET).remove([path]);
  },

  // Short-lived (60s) signed URL - the private bucket has no public access,
  // so every download is minted fresh, after CVVersionService has already
  // verified this user owns the row the path came from.
  async createSignedDownloadUrl(path: string, downloadFileName: string) {
    const supabase = await createClient();
    return supabase.storage
      .from(CV_FILE_BUCKET)
      .createSignedUrl(path, 60, { download: downloadFileName });
  },
};
