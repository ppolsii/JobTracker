import { CVVersionRepository } from "@/features/cv/repositories/cv-version.repository";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { validateCVFile } from "@/features/cv/utils/cv-file-validation";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";
import { normalize } from "@/shared/utils/normalize";
import type { ActionResult } from "@/types/action-result";

interface CVVersionFields {
  name: string;
  description?: string;
}

function fileValidationError(message: string): ActionResult<never> {
  return {
    success: false,
    error: { message, code: ERROR_CODES.VALIDATION_ERROR },
  };
}

function uploadFailedError(): ActionResult<never> {
  return {
    success: false,
    error: {
      message: "Something went wrong while uploading the CV file.",
      code: ERROR_CODES.INTERNAL_ERROR,
    },
  };
}

function duplicateNameError(name: string): ActionResult<never> {
  return {
    success: false,
    error: {
      message: `A CV version named "${name}" already exists.`,
      code: ERROR_CODES.CONFLICT,
    },
  };
}

export const CVVersionService = {
  // Phase 40 (CV Library): "each entry represents a real uploaded CV" - a
  // new CV version must have a PDF attached, enforced here (not a NOT NULL
  // column - see the migration's own comment) so a corrupted upload never
  // leaves an unusable, fileless row behind: the file is uploaded to
  // storage FIRST, under a freshly generated id, and only once that
  // succeeds is the row created with that same id. If the row insert then
  // fails (e.g. a concurrent duplicate name), the orphaned upload is
  // removed - it was never attached to a row the user could see.
  async create(
    userId: string,
    input: CVVersionFields,
    file: File
  ): Promise<ActionResult<CVVersion>> {
    const name = input.name.trim();

    // Pre-check for a friendly error in the common case; the partial unique
    // index on (user_id, lower(name)) is the actual enforcement, since this
    // check alone can't prevent a race between two concurrent requests.
    const existing = await CVVersionRepository.findActiveByName(userId, name);
    if (existing.data) {
      return duplicateNameError(name);
    }

    const validation = validateCVFile(file);
    if (!validation.valid) {
      return fileValidationError(validation.message);
    }

    const id = crypto.randomUUID();
    const uploaded = await CVVersionRepository.uploadFile(userId, id, file);
    if (uploaded.error) {
      return uploadFailedError();
    }

    const { data, error } = await CVVersionRepository.create({
      id,
      user_id: userId,
      name,
      description: normalize(input.description),
      file_path: uploaded.path,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    });

    if (error) {
      await CVVersionRepository.removeFile(uploaded.path);
      if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
        return duplicateNameError(name);
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while creating the CV version.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  // `file` is optional here (unlike create) - editing a CV version's name/
  // description should never require re-uploading its file. When given, it
  // replaces the existing file in place (same deterministic path, so
  // nothing about the row's identity or its applications' references
  // changes) - "Replace PDF" from the UI's perspective.
  async update(
    userId: string,
    id: string,
    input: CVVersionFields,
    file?: File
  ): Promise<ActionResult<CVVersion>> {
    const name = input.name.trim();

    const existing = await CVVersionRepository.findActiveByName(userId, name);
    if (existing.data && existing.data.id !== id) {
      return duplicateNameError(name);
    }

    let filePatch: {
      file_path: string;
      file_name: string;
      file_size: number;
      uploaded_at: string;
    } | null = null;

    if (file) {
      const validation = validateCVFile(file);
      if (!validation.valid) {
        return fileValidationError(validation.message);
      }

      const uploaded = await CVVersionRepository.uploadFile(userId, id, file);
      if (uploaded.error) {
        return uploadFailedError();
      }

      filePatch = {
        file_path: uploaded.path,
        file_name: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      };
    }

    const { data, error } = await CVVersionRepository.update(userId, id, {
      name,
      description: normalize(input.description),
      ...filePatch,
    });

    if (error) {
      if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
        return duplicateNameError(name);
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while updating the CV version.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: "CV version not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    return { success: true, data };
  },

  // Phase 40 (CV Library): mints a short-lived signed URL for one CV
  // version's file - available for archived rows too (an archived CV is
  // still fully downloadable, only hidden from active pickers), matching
  // findFileById's own deliberate choice not to filter on deleted_at.
  async getDownloadUrl(
    userId: string,
    id: string
  ): Promise<ActionResult<{ url: string; fileName: string }>> {
    const { data, error } = await CVVersionRepository.findFileById(
      userId,
      id
    );

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "CV version not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    if (!data.file_path) {
      return {
        success: false,
        error: {
          message: "This CV version has no uploaded file yet.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    const fileName = data.file_name ?? "cv.pdf";
    const signed = await CVVersionRepository.createSignedDownloadUrl(
      data.file_path,
      fileName
    );

    if (signed.error || !signed.data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while preparing the download.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: { url: signed.data.signedUrl, fileName } };
  },

  // BUSINESS_RULES.md "CV Rules": "A CV version cannot be deleted while
  // applications reference it." and "Auditability": deletion attempts should
  // be logged. Message style follows BUSINESS_RULES.md "Error Handling"
  // ("This CV version is currently used by 14 applications.").
  async archive(userId: string, id: string): Promise<ActionResult<CVVersion>> {
    const { count, error: countError } =
      await CVVersionRepository.countActiveApplications(userId, id);

    if (countError) {
      return {
        success: false,
        error: {
          message: "Something went wrong while archiving the CV version.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (count && count > 0) {
      console.warn(
        `Rejected CV version archive: CV ${id} referenced by ${count} application(s) (user ${userId}).`
      );
      return {
        success: false,
        error: {
          message: `This CV version is currently used by ${count} application${count === 1 ? "" : "s"}. Remove or reassign them before archiving.`,
          code: ERROR_CODES.CONFLICT,
        },
      };
    }

    const { data, error } = await CVVersionRepository.archive(userId, id);

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "CV version not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    console.info(`CV version ${id} archived by user ${userId}.`);
    return { success: true, data };
  },

  // IMPLEMENTATION_ORDER_V2.md Phase 26. Re-validates the same uniqueness
  // rule create/update already enforce - restoring a CV version must fail
  // if a different, newer active one now has the same name. The partial
  // unique index is the real enforcement (same 23505 mapping create/update
  // already use).
  async restore(userId: string, id: string): Promise<ActionResult<CVVersion>> {
    const { data, error } = await CVVersionRepository.restore(userId, id);

    if (error) {
      if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
        return {
          success: false,
          error: {
            message:
              "An active CV version already has this name. Rename the active one, then try restoring again.",
            code: ERROR_CODES.CONFLICT,
          },
        };
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while restoring the CV version.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: "Archived CV version not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    console.info(`CV version ${id} restored by user ${userId}.`);
    return { success: true, data };
  },

  async list(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<
    ActionResult<{
      cvVersions: CVVersion[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { data, error, count } = await CVVersionRepository.list(
      userId,
      params
    );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading CV versions.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return {
      success: true,
      data: {
        cvVersions: data ?? [],
        total: count ?? 0,
        page: params.page,
        limit: params.limit,
      },
    };
  },

  // Backs the Archived view (IMPLEMENTATION_ORDER_V2.md Phase 26) - paginated,
  // unlike ExportService's unbounded listAllIncludingArchived below.
  async listArchived(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<
    ActionResult<{
      cvVersions: CVVersion[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { data, error, count } = await CVVersionRepository.listArchived(
      userId,
      params
    );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading archived CV versions.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return {
      success: true,
      data: {
        cvVersions: data ?? [],
        total: count ?? 0,
        page: params.page,
        limit: params.limit,
      },
    };
  },

  // Backs ExportService only - see CVVersionRepository.listAllIncludingArchived.
  async listAllIncludingArchived(
    userId: string
  ): Promise<ActionResult<CVVersion[]>> {
    const { data, error } =
      await CVVersionRepository.listAllIncludingArchived(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading CV versions.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },
};
