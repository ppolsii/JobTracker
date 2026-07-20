import { ApplicationNoteRepository } from "@/features/applications/repositories/application-note.repository";
import { ApplicationService } from "@/features/applications/services/application.service";
import type {
  ApplicationNote,
  NoteExportRow,
  NoteSearchRow,
} from "@/features/applications/types/application.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// BUSINESS_RULES.md "Notes": "Notes belong to exactly one application."
// Every operation here goes through ApplicationService.getById - not
// ApplicationRepository.findById directly - to verify ownership. This
// deliberately differs from Phase 9's ApplicationStatusService (which calls
// ApplicationRepository directly, since it's a sibling sub-concern of the
// same applications table): Notes is coordinating with an already-complete,
// independent feature (Applications), and this session's instructions are
// explicit that a new feature must reuse an existing feature's *Service*
// rather than reach past it into that feature's Repository, so ownership
// validation is never duplicated and Applications remains the single source
// of truth for what "owned and active" means.

// Shared by update/archive: both operate on a note addressed by its own id,
// so both must first resolve which application it belongs to, then verify
// that application is owned by this user via ApplicationService (the same
// ownership check `list`/`create` use directly, since they already have the
// application_id). Kept private - not exported - since it's an internal
// resolve-then-check step, not a public operation of its own.
async function findOwnedNote(
  userId: string,
  noteId: string
): Promise<ActionResult<ApplicationNote>> {
  const note = await ApplicationNoteRepository.findById(noteId);
  if (!note.data) {
    return {
      success: false,
      error: { message: "Note not found.", code: ERROR_CODES.NOT_FOUND },
    };
  }

  const application = await ApplicationService.getById(
    userId,
    note.data.application_id
  );
  if (!application.success) {
    return {
      success: false,
      error: { message: "Note not found.", code: ERROR_CODES.NOT_FOUND },
    };
  }

  return { success: true, data: note.data };
}

export const ApplicationNoteService = {
  async list(
    userId: string,
    applicationId: string
  ): Promise<ActionResult<ApplicationNote[]>> {
    const application = await ApplicationService.getById(userId, applicationId);
    if (!application.success) return application;

    const { data, error } =
      await ApplicationNoteRepository.listByApplication(applicationId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading notes.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },

  async create(
    userId: string,
    applicationId: string,
    content: string
  ): Promise<ActionResult<ApplicationNote>> {
    const application = await ApplicationService.getById(userId, applicationId);
    if (!application.success) return application;

    const { data, error } = await ApplicationNoteRepository.create({
      application_id: applicationId,
      content: content.trim(),
    });

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while creating the note.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  async update(
    userId: string,
    noteId: string,
    content: string
  ): Promise<ActionResult<ApplicationNote>> {
    const owned = await findOwnedNote(userId, noteId);
    if (!owned.success) return owned;

    const { data, error } = await ApplicationNoteRepository.update(
      noteId,
      content.trim()
    );

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while updating the note.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  // BUSINESS_RULES.md "Soft Deletes": archiving sets deleted_at; no hard
  // DELETE (application_notes has no DELETE grant/RLS policy at all, matching
  // every other business entity in this project).
  async archive(
    userId: string,
    noteId: string
  ): Promise<ActionResult<ApplicationNote>> {
    const owned = await findOwnedNote(userId, noteId);
    if (!owned.success) return owned;

    const { data, error } = await ApplicationNoteRepository.archive(noteId);

    if (error || !data) {
      return {
        success: false,
        error: { message: "Note not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    console.info(`Note ${noteId} archived by user ${userId}.`);
    return { success: true, data };
  },

  // Phase 13 (Search) "Search notes". Backs SearchService, matching how
  // AnalyticsService (Phase 12) only ever reaches Applications through
  // ApplicationService - never ApplicationRepository directly. The same
  // discipline applies here: SearchService goes through this Service, never
  // ApplicationNoteRepository, which stays the only module allowed to query
  // application_notes (ADR-008).
  async search(
    userId: string,
    query: string,
    limit: number
  ): Promise<ActionResult<NoteSearchRow[]>> {
    const { data, error } = await ApplicationNoteRepository.searchByContent(
      userId,
      query,
      limit
    );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while searching notes.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },

  // Phase 14 (Export) "Export contains every user-owned entity". Backs
  // ExportService, matching the same "go through this Service, never
  // ApplicationNoteRepository directly" discipline as `search` above.
  async listAllForUser(userId: string): Promise<ActionResult<NoteExportRow[]>> {
    const { data, error } =
      await ApplicationNoteRepository.listAllForUser(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading notes.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },
};
