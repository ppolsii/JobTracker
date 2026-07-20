import { CVVersionRepository } from "@/features/cv/repositories/cv-version.repository";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";
import { normalize } from "@/shared/utils/normalize";
import type { ActionResult } from "@/types/action-result";

interface CVVersionFields {
  name: string;
  description?: string;
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
  async create(
    userId: string,
    input: CVVersionFields
  ): Promise<ActionResult<CVVersion>> {
    const name = input.name.trim();

    // Pre-check for a friendly error in the common case; the partial unique
    // index on (user_id, lower(name)) is the actual enforcement, since this
    // check alone can't prevent a race between two concurrent requests.
    const existing = await CVVersionRepository.findActiveByName(userId, name);
    if (existing.data) {
      return duplicateNameError(name);
    }

    const { data, error } = await CVVersionRepository.create({
      user_id: userId,
      name,
      description: normalize(input.description),
    });

    if (error) {
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

  async update(
    userId: string,
    id: string,
    input: CVVersionFields
  ): Promise<ActionResult<CVVersion>> {
    const name = input.name.trim();

    const existing = await CVVersionRepository.findActiveByName(userId, name);
    if (existing.data && existing.data.id !== id) {
      return duplicateNameError(name);
    }

    const { data, error } = await CVVersionRepository.update(userId, id, {
      name,
      description: normalize(input.description),
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
