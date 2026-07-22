import {
  ApplicationRepository,
  type ApplicationListParams,
} from "@/features/applications/repositories/application.repository";
import type { CreateApplicationInput } from "@/features/applications/schemas/application.schema";
import type {
  AnalyticsApplicationRow,
  Application,
  ApplicationWithRelations,
} from "@/features/applications/types/application.types";
import { DEFAULT_CURRENCY } from "@/features/applications/constants/application.constants";
import { BillingService } from "@/features/billing/services/billing.service";
import { CompanyRepository } from "@/features/companies/repositories/company.repository";
import { CVVersionRepository } from "@/features/cv/repositories/cv-version.repository";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";
import { normalize } from "@/shared/utils/normalize";
import type { ActionResult } from "@/types/action-result";

// BUSINESS_RULES.md "Applications": "Must reference an existing company...
// Must reference an existing CV version." A plain FK only guarantees the
// row exists; it does not guarantee it belongs to this user or is still
// active, so both are checked explicitly before every create/update.
async function validateReferences(
  userId: string,
  companyId: string,
  cvVersionId: string
): Promise<ActionResult<true>> {
  const [company, cvVersion] = await Promise.all([
    CompanyRepository.findActiveById(userId, companyId),
    CVVersionRepository.findActiveById(userId, cvVersionId),
  ]);

  if (!company.data) {
    return {
      success: false,
      error: {
        message: "Selected company was not found or has been archived.",
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    };
  }
  if (!cvVersion.data) {
    return {
      success: false,
      error: {
        message: "Selected CV version was not found or has been archived.",
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    };
  }
  return { success: true, data: true };
}

// DATABASE.md CHECK constraints are the real enforcement (Zod at the Action
// layer is only a friendly pre-check); this maps a constraint violation that
// reaches the database anyway back to the same friendly wording.
function friendlyConstraintMessage(message: string): string {
  if (message.includes("applications_salary_range_check")) {
    return "Minimum salary must be less than or equal to maximum salary.";
  }
  if (message.includes("applications_date_not_future_check")) {
    return "Application date cannot be in the future.";
  }
  return "This application has invalid data.";
}

function toInsertPayload(userId: string, input: CreateApplicationInput) {
  return {
    user_id: userId,
    company_id: input.company_id,
    cv_version_id: input.cv_version_id,
    position: input.position.trim(),
    application_date: normalize(input.application_date),
    job_url: normalize(input.job_url),
    location: normalize(input.location),
    work_mode: input.work_mode ?? null,
    employment_type: input.employment_type ?? null,
    source: input.source ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    currency: input.currency?.trim().toUpperCase() || DEFAULT_CURRENCY,
  };
}

export const ApplicationService = {
  async create(
    userId: string,
    input: CreateApplicationInput
  ): Promise<ActionResult<Application>> {
    // BUSINESS_RULES.md "Billing": Free plan is limited to a maximum number
    // of active applications. BillingService owns this decision entirely -
    // this Service never inspects plan or counts anything itself.
    const capacity = await BillingService.requireApplicationCapacity(userId);
    if (!capacity.success) return capacity;

    const validation = await validateReferences(
      userId,
      input.company_id,
      input.cv_version_id
    );
    if (!validation.success) return validation;

    const { data, error } = await ApplicationRepository.create(
      toInsertPayload(userId, input)
    );

    if (error || !data) {
      if (error?.code === POSTGRES_ERROR_CODES.CHECK_VIOLATION) {
        return {
          success: false,
          error: {
            message: friendlyConstraintMessage(error.message),
            code: ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }
      if (error?.code === POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
        return {
          success: false,
          error: {
            message:
              "Selected company or CV version could not be used - it may have just been archived.",
            code: ERROR_CODES.CONFLICT,
          },
        };
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while creating the application.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    // BUSINESS_RULES.md "Status History": "Every status change must generate
    // a history record" - the genesis row for this new application.
    // ApplicationRepository.create writes it atomically with the
    // application itself via the create_application_with_genesis RPC
    // (Phase 20), so there is nothing further to do here.
    return { success: true, data };
  },

  async update(
    userId: string,
    id: string,
    input: CreateApplicationInput
  ): Promise<ActionResult<Application>> {
    const validation = await validateReferences(
      userId,
      input.company_id,
      input.cv_version_id
    );
    if (!validation.success) return validation;

    const { data, error } = await ApplicationRepository.update(
      userId,
      id,
      toInsertPayload(userId, input)
    );

    if (error) {
      if (error.code === POSTGRES_ERROR_CODES.CHECK_VIOLATION) {
        return {
          success: false,
          error: {
            message: friendlyConstraintMessage(error.message),
            code: ERROR_CODES.VALIDATION_ERROR,
          },
        };
      }
      if (error.code === POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
        return {
          success: false,
          error: {
            message:
              "Selected company or CV version could not be used - it may have just been archived.",
            code: ERROR_CODES.CONFLICT,
          },
        };
      }
      return {
        success: false,
        error: {
          message: "Something went wrong while updating the application.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: "Application not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    return { success: true, data };
  },

  // BUSINESS_RULES.md "Soft Deletes": applications are never physically
  // deleted. Unlike Companies/CV Versions, applications are not referenced
  // by any other entity that would block deletion (notes/status history
  // reference *this* application, not the other way around), so no
  // reference-count guard is needed here.
  async archive(
    userId: string,
    id: string
  ): Promise<ActionResult<Application>> {
    const { data, error } = await ApplicationRepository.archive(userId, id);

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Application not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    console.info(`Application ${id} archived by user ${userId}.`);
    return { success: true, data };
  },

  // API.md "Get Application": "Returns a single application. Only if owned
  // by the authenticated user." Backs the Application Detail page (Phase 9)
  // and ApplicationStatusService's ownership/current-status check.
  async getById(
    userId: string,
    id: string
  ): Promise<ActionResult<ApplicationWithRelations>> {
    const { data, error } = await ApplicationRepository.findById(userId, id);

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Application not found.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    return { success: true, data };
  },

  // Backs AnalyticsService (Phase 12): a bulk, unpaginated read distinct
  // from `list`'s page-at-a-time contract. AnalyticsService calls this
  // Service (not ApplicationRepository directly) so Applications remains
  // the single source of truth for its own data, matching this phase's
  // "reuse existing Services" instruction.
  async listAllForAnalytics(
    userId: string
  ): Promise<ActionResult<AnalyticsApplicationRow[]>> {
    const { data, error } =
      await ApplicationRepository.listAllForAnalytics(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading analytics data.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },

  async list(
    userId: string,
    params: ApplicationListParams
  ): Promise<
    ActionResult<{
      applications: ApplicationWithRelations[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { data, error, count } = await ApplicationRepository.list(
      userId,
      params
    );

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading applications.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return {
      success: true,
      data: {
        applications: data ?? [],
        total: count ?? 0,
        page: params.page,
        limit: params.limit,
      },
    };
  },

  // Backs ExportService only - see ApplicationRepository.listAllIncludingArchived.
  async listAllIncludingArchived(
    userId: string
  ): Promise<ActionResult<ApplicationWithRelations[]>> {
    const { data, error } =
      await ApplicationRepository.listAllIncludingArchived(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading applications.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: data ?? [] };
  },
};
