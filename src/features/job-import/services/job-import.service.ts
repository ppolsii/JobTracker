import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import type {
  Application,
  ApplicationSource,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";
import { BillingService } from "@/features/billing/services/billing.service";
import { CompanyService } from "@/features/companies/services/company.service";
import { JOB_IMPORT_PROVIDERS } from "@/features/job-import/providers/job-import-providers.registry";
import { selectJobImportProvider } from "@/features/job-import/providers/select-job-import-provider";
import type { ExtractedJobData } from "@/features/job-import/types/job-import.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

export interface ConfirmJobImportInput {
  company: string;
  cv_version_id: string;
  position: string;
  application_date?: string;
  job_url?: string;
  location?: string;
  work_mode?: WorkMode;
  employment_type?: EmploymentType;
  source?: ApplicationSource;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  description?: string;
}

// IMPLEMENTATION_ORDER_V2.md Phase 32 (Smart Job Import). Owns provider
// selection, orchestration, and error handling for the whole import
// workflow - Repositories stay data-access only (this Service is the only
// caller of JOB_IMPORT_PROVIDERS), and no provider-specific branching exists
// anywhere outside this file.
export const JobImportService = {
  // Workflow steps 3-5: "System validates the URL" (the URL's shape is
  // already validated by extractJobUrlSchema before this is ever called -
  // this Service validates it is *supported*, a business decision, not an
  // input-shape one), "System detects the provider," "System extracts job
  // information."
  async extract(
    userId: string,
    url: string
  ): Promise<ActionResult<ExtractedJobData & { providerName: string }>> {
    // "PRO SUPPORT": Smart Job Import is Pro-only. Reuses
    // BillingService.requireProPlan - the same check ExportService already
    // uses - rather than a second, parallel plan check ("do not duplicate
    // Pro gating logic").
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const provider = selectJobImportProvider(url, JOB_IMPORT_PROVIDERS);
    if (!provider) {
      return {
        success: false,
        error: {
          message:
            "This job URL isn't supported yet. You can still enter the details manually.",
          code: ERROR_CODES.VALIDATION_ERROR,
        },
      };
    }

    try {
      const data = await provider.extract(url);
      return {
        success: true,
        data: { ...data, providerName: provider.name },
      };
    } catch {
      // "Never expose internal errors" - whatever a provider's own extract()
      // threw (a future provider might hit a network failure, a parsing
      // error, anything) is never surfaced directly.
      return {
        success: false,
        error: {
          message:
            "We couldn't import this job automatically. You can still fill in the details manually.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
  },

  // Workflow steps 7-8: "User confirms" / "Application is created."
  // Resolves the free-text company name to an id (creating it if it doesn't
  // exist yet), then creates the application through the exact same
  // ApplicationService.create every other creation path uses - the Free
  // plan's application-count limit and reference validation are still fully
  // enforced, not bypassed for imports.
  async confirmImport(
    userId: string,
    input: ConfirmJobImportInput
  ): Promise<ActionResult<Application>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const company = await CompanyService.findOrCreateByName(
      userId,
      input.company
    );
    if (!company.success) return company;

    const applicationResult = await ApplicationService.create(userId, {
      company_id: company.data.id,
      cv_version_id: input.cv_version_id,
      position: input.position,
      application_date: input.application_date,
      job_url: input.job_url,
      location: input.location,
      work_mode: input.work_mode,
      employment_type: input.employment_type,
      source: input.source,
      salary_min: input.salary_min,
      salary_max: input.salary_max,
      currency: input.currency,
    });
    if (!applicationResult.success) return applicationResult;

    // `description` has no column on `applications` - it becomes the
    // application's first Note instead (application_notes already exists
    // exactly for "relevant information for every application").
    // Best-effort: the application itself was already created successfully,
    // so a failure to attach this optional note is logged, not surfaced as
    // an import failure.
    if (input.description?.trim()) {
      const noteResult = await ApplicationNoteService.create(
        userId,
        applicationResult.data.id,
        input.description
      );
      if (!noteResult.success) {
        console.warn(
          `Job import for application ${applicationResult.data.id} succeeded, but attaching its description note failed: ${noteResult.error.message}`
        );
      }
    }

    return applicationResult;
  },
};
