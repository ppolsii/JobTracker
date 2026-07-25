import { z } from "zod";

import {
  APPLICATION_SOURCE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import {
  applicationDateField,
  refineDateNotInFuture,
} from "@/features/applications/schemas/application.schema";

// IMPLEMENTATION_ORDER_V2.md Phase 32 (Smart Job Import), step 3: "System
// validates the URL." Rejects an empty URL and anything that isn't a
// well-formed URL up front, before any provider is even selected.
export const extractJobUrlSchema = z.object({
  url: z.string().trim().min(1, "Enter a job URL.").url("Enter a valid URL."),
});
export type ExtractJobUrlInput = z.infer<typeof extractJobUrlSchema>;

// The review form's schema (step 6/7: "User reviews the extracted data" /
// "User confirms"). Deliberately NOT createApplicationSchema: `company` here
// is the free-text name a provider extracted (or the user typed), not an
// existing company_id - CompanyService.findOrCreateByName resolves it to an
// id at confirm time. Every other field mirrors createApplicationSchema's
// own validation exactly (reused directly where the field is identical:
// applicationDateField/refineDateNotInFuture), since Smart Job Import
// creates the same kind of application through the same business rules -
// it just fills the form in for you first.
export const confirmJobImportSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required.").max(255),
    cv_version_id: z.string().uuid("Select a CV version."),
    position: z.string().trim().min(1, "Position is required.").max(255),
    application_date: applicationDateField,
    job_url: z.string().trim().max(2048).optional(),
    location: z.string().trim().max(255).optional(),
    work_mode: z.enum(WORK_MODE_OPTIONS).optional(),
    employment_type: z.enum(EMPLOYMENT_TYPE_OPTIONS).optional(),
    source: z.enum(APPLICATION_SOURCE_OPTIONS).optional(),
    salary_min: z.coerce.number().int().nonnegative().optional(),
    salary_max: z.coerce.number().int().nonnegative().optional(),
    currency: z.string().trim().max(10, "Currency code is too long.").optional(),
    // Has no column on `applications` - becomes the application's first Note
    // (JobImportService.confirmImport). Matches noteContentField's own
    // bound (application.schema.ts).
    description: z.string().trim().max(10000, "Description is too long.").optional(),
  })
  .refine(
    (data) =>
      data.salary_min === undefined ||
      data.salary_max === undefined ||
      data.salary_min <= data.salary_max,
    {
      message: "Minimum salary must be less than or equal to maximum salary.",
      path: ["salary_max"],
    }
  )
  .refine(refineDateNotInFuture, {
    message: "Application date cannot be in the future.",
    path: ["application_date"],
  });
export type ConfirmJobImportInput = z.infer<typeof confirmJobImportSchema>;
