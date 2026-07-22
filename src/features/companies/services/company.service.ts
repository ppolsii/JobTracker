import { CompanyRepository } from "@/features/companies/repositories/company.repository";
import type { Company } from "@/features/companies/types/company.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";
import { normalize } from "@/shared/utils/normalize";
import type { ActionResult } from "@/types/action-result";

interface CompanyFields {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
}

function duplicateNameError(name: string): ActionResult<never> {
  return {
    success: false,
    error: {
      message: `A company named "${name}" already exists.`,
      code: ERROR_CODES.CONFLICT,
    },
  };
}

export const CompanyService = {
  async create(
    userId: string,
    input: CompanyFields
  ): Promise<ActionResult<Company>> {
    const name = input.name.trim();

    // Pre-check for a friendly error in the common case; the partial unique
    // index on (user_id, lower(name)) is the actual enforcement, since this
    // check alone can't prevent a race between two concurrent requests.
    const existing = await CompanyRepository.findActiveByName(userId, name);
    if (existing.data) {
      return duplicateNameError(name);
    }

    const { data, error } = await CompanyRepository.create({
      user_id: userId,
      name,
      website: normalize(input.website),
      industry: normalize(input.industry),
      size: normalize(input.size),
      country: normalize(input.country),
      city: normalize(input.city),
    });

    if (error) {
      if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
        return duplicateNameError(name);
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while creating the company.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  async update(
    userId: string,
    id: string,
    input: CompanyFields
  ): Promise<ActionResult<Company>> {
    const name = input.name.trim();

    const existing = await CompanyRepository.findActiveByName(userId, name);
    if (existing.data && existing.data.id !== id) {
      return duplicateNameError(name);
    }

    const { data, error } = await CompanyRepository.update(userId, id, {
      name,
      website: normalize(input.website),
      industry: normalize(input.industry),
      size: normalize(input.size),
      country: normalize(input.country),
      city: normalize(input.city),
    });

    if (error) {
      if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
        return duplicateNameError(name);
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while updating the company.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: { message: "Company not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    return { success: true, data };
  },

  // BUSINESS_RULES.md "Company Rules": "A company cannot be deleted if
  // applications reference it... Prefer preventing deletion." and
  // "Auditability": deletion attempts should be logged.
  async archive(userId: string, id: string): Promise<ActionResult<Company>> {
    const { count, error: countError } =
      await CompanyRepository.countActiveApplications(userId, id);

    if (countError) {
      return {
        success: false,
        error: {
          message: "Something went wrong while archiving the company.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (count && count > 0) {
      console.warn(
        `Rejected company archive: company ${id} referenced by ${count} application(s) (user ${userId}).`
      );
      return {
        success: false,
        error: {
          message: `This company is currently referenced by ${count} application${count === 1 ? "" : "s"}. Remove or reassign them before archiving.`,
          code: ERROR_CODES.CONFLICT,
        },
      };
    }

    const { data, error } = await CompanyRepository.archive(userId, id);

    if (error || !data) {
      return {
        success: false,
        error: { message: "Company not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    console.info(`Company ${id} archived by user ${userId}.`);
    return { success: true, data };
  },

  // IMPLEMENTATION_ORDER_V2.md Phase 26. BUSINESS_RULES.md "Billing"-style
  // precedent for restore: re-validates the same uniqueness rule create/
  // update already enforce - restoring "Google" must fail if a different,
  // newer active "Google" now exists. The partial unique index is the real
  // enforcement (same 23505 mapping create/update already use); no separate
  // pre-check query is needed since the archived row's own name never
  // changes as part of restoring it.
  async restore(userId: string, id: string): Promise<ActionResult<Company>> {
    const { data, error } = await CompanyRepository.restore(userId, id);

    if (error) {
      if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
        return {
          success: false,
          error: {
            message:
              "An active company already has this name. Rename the active company, then try restoring again.",
            code: ERROR_CODES.CONFLICT,
          },
        };
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while restoring the company.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: "Archived company not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    console.info(`Company ${id} restored by user ${userId}.`);
    return { success: true, data };
  },

  async list(
    userId: string,
    params: { query?: string; page: number; limit: number }
  ): Promise<
    ActionResult<{
      companies: Company[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { data, error, count } = await CompanyRepository.list(userId, params);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading companies.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return {
      success: true,
      data: {
        companies: data ?? [],
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
      companies: Company[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { data, error, count } = await CompanyRepository.listArchived(
      userId,
      params
    );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading archived companies.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return {
      success: true,
      data: {
        companies: data ?? [],
        total: count ?? 0,
        page: params.page,
        limit: params.limit,
      },
    };
  },

  // Backs ExportService only - see CompanyRepository.listAllIncludingArchived.
  async listAllIncludingArchived(
    userId: string
  ): Promise<ActionResult<Company[]>> {
    const { data, error } =
      await CompanyRepository.listAllIncludingArchived(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading companies.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },
};
