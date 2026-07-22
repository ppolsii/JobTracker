import { z } from "zod";

import {
  APPLICATION_SORT_BY_VALUES,
  APPLICATION_SOURCE_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Shared by createApplicationSchema and changeApplicationStatusSchema (the
// Wishlist -> Applied transition also collects this field - see
// ApplicationStatusService.changeStatus) - one definition, not reimplemented
// per schema.
const applicationDateField = z
  .string()
  .trim()
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
    message: "Enter a valid date.",
  })
  .optional();

function refineDateNotInFuture<T extends { application_date?: string }>(
  data: T
): boolean {
  return !data.application_date || data.application_date <= todayISODate();
}

// FEATURES.md Feature 5 required fields: Company, Position, CV Version.
// `application_date` deviates from the literal "Required" list (see
// CHANGELOG "Deviations"): DATABASE.md's own applications_date_required_
// after_wishlist_check constraint only requires it once current_status
// moves past Wishlist, and every application created here starts at
// Wishlist (status transitions are Phase 9), so it must stay optional here.
export const createApplicationSchema = z
  .object({
    company_id: z.string().uuid("Select a company."),
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
    // Loose validation (like job_url/location above), not `.length(3)`: an
    // exact-length check would reject an emptied-out field entirely, but
    // ApplicationService.create/update treats blank as "use the default"
    // (DEFAULT_CURRENCY) - the same optional-text-field shape as every
    // other feature in this codebase, not a hard currency-code format rule.
    currency: z
      .string()
      .trim()
      .max(10, "Currency code is too long.")
      .optional(),
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
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = createApplicationSchema.and(
  z.object({ id: z.string().uuid() })
);
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const archiveApplicationSchema = z.object({
  id: z.string().uuid(),
});
export type ArchiveApplicationInput = z.infer<typeof archiveApplicationSchema>;

// IMPLEMENTATION_ORDER_V2.md Phase 26.
export const restoreApplicationSchema = z.object({
  id: z.string().uuid(),
});
export type RestoreApplicationInput = z.infer<typeof restoreApplicationSchema>;

// FEATURES.md Feature 6 / BUSINESS_RULES.md "Allowed State Transitions".
// `application_date` is only actually required by ApplicationStatusService
// when transitioning out of Wishlist for the first time - validated there,
// not here, since that depends on the application's current stored date,
// which this schema has no access to.
export const changeApplicationStatusSchema = z
  .object({
    id: z.string().uuid(),
    new_status: z.enum(APPLICATION_STATUS_OPTIONS),
    application_date: applicationDateField,
  })
  .refine(refineDateNotInFuture, {
    message: "Application date cannot be in the future.",
    path: ["application_date"],
  });
export type ChangeApplicationStatusInput = z.infer<
  typeof changeApplicationStatusSchema
>;

// FEATURES.md Feature 11 / BUSINESS_RULES.md "Notes": "Markdown is supported.
// Rich text is not." - a plain text field (no length-agnostic rich-text JSON
// shape), matching DATABASE.md's `content text` column. 10,000 chars is a
// generous, unspecified-by-the-docs bound consistent with every other text
// field in this codebase being explicitly bounded.
const noteContentField = z
  .string()
  .trim()
  .min(1, "Note content is required.")
  .max(10000, "Note is too long.");

export const createApplicationNoteSchema = z.object({
  application_id: z.string().uuid(),
  content: noteContentField,
});
export type CreateApplicationNoteInput = z.infer<
  typeof createApplicationNoteSchema
>;

export const updateApplicationNoteSchema = z.object({
  id: z.string().uuid(),
  content: noteContentField,
});
export type UpdateApplicationNoteInput = z.infer<
  typeof updateApplicationNoteSchema
>;

export const archiveApplicationNoteSchema = z.object({
  id: z.string().uuid(),
});
export type ArchiveApplicationNoteInput = z.infer<
  typeof archiveApplicationNoteSchema
>;

// Sanitizes the applications list page's searchParams (untrusted input per
// CODE_STYLE.md "Security"). Falls back to sane defaults instead of
// erroring, since malformed filters in the URL shouldn't break a read.
export const listApplicationsSchema = z.object({
  query: z.string().trim().max(255).optional(),
  archived: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  status: z.enum(APPLICATION_STATUS_OPTIONS).optional().catch(undefined),
  company_id: z.string().uuid().optional().catch(undefined),
  cv_version_id: z.string().uuid().optional().catch(undefined),
  source: z.enum(APPLICATION_SOURCE_OPTIONS).optional().catch(undefined),
  work_mode: z.enum(WORK_MODE_OPTIONS).optional().catch(undefined),
  employment_type: z.enum(EMPLOYMENT_TYPE_OPTIONS).optional().catch(undefined),
  date_from: z.string().trim().max(10).optional(),
  date_to: z.string().trim().max(10).optional(),
  salary_min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  salary_max: z.coerce.number().int().nonnegative().optional().catch(undefined),
  sort_by: z.enum(APPLICATION_SORT_BY_VALUES).catch("application_date"),
  sort_dir: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
});
export type ListApplicationsInput = z.infer<typeof listApplicationsSchema>;
