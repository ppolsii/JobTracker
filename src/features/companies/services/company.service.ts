import { CompanyRepository } from "@/features/companies/repositories/company.repository";
import type { Company } from "@/features/companies/types/company.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

const UNIQUE_VIOLATION = "23505";

interface CompanyFields {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
}

// Empty strings from untouched optional form fields become null, matching
// DATABASE.md's nullable columns rather than storing empty strings.
function normalize(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
      if (error.code === UNIQUE_VIOLATION) {
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
      if (error.code === UNIQUE_VIOLATION) {
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
    const { data, error, count } = await CompanyRepository.list(
      userId,
      params
    );

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
};
