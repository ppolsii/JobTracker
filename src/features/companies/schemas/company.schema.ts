import { z } from "zod";

// FEATURES.md Feature 3 validation: "Company name is required." Everything
// else is optional per DATABASE.md's companies table.
export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required.").max(255),
  website: z.string().trim().max(2048).optional(),
  industry: z.string().trim().max(255).optional(),
  size: z.string().trim().max(255).optional(),
  country: z.string().trim().max(255).optional(),
  city: z.string().trim().max(255).optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.extend({
  id: z.string().uuid(),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const archiveCompanySchema = z.object({
  id: z.string().uuid(),
});
export type ArchiveCompanyInput = z.infer<typeof archiveCompanySchema>;

// IMPLEMENTATION_ORDER_V2.md Phase 26.
export const restoreCompanySchema = z.object({
  id: z.string().uuid(),
});
export type RestoreCompanyInput = z.infer<typeof restoreCompanySchema>;

// Used to sanitize the companies list page's searchParams (untrusted input
// per CODE_STYLE.md "Security"). Falls back to sane defaults instead of
// erroring, since a malformed page/limit in the URL shouldn't break a read.
export const listCompaniesSchema = z.object({
  query: z.string().trim().max(255).optional(),
  // Query-string values are always strings - only the literal "true" means
  // true, so a stray `?archived=false` (or anything else) doesn't
  // accidentally flip on via truthy-string coercion.
  archived: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
});
export type ListCompaniesInput = z.infer<typeof listCompaniesSchema>;
