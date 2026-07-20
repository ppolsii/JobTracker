import { z } from "zod";

// FEATURES.md Feature 4 validation: "CV names must be unique per user." Name
// is the only required field; description is optional per DATABASE.md's
// cv_versions table.
export const createCVVersionSchema = z.object({
  name: z.string().trim().min(1, "CV name is required.").max(255),
  description: z.string().trim().max(2048).optional(),
});
export type CreateCVVersionInput = z.infer<typeof createCVVersionSchema>;

export const updateCVVersionSchema = createCVVersionSchema.extend({
  id: z.string().uuid(),
});
export type UpdateCVVersionInput = z.infer<typeof updateCVVersionSchema>;

export const archiveCVVersionSchema = z.object({
  id: z.string().uuid(),
});
export type ArchiveCVVersionInput = z.infer<typeof archiveCVVersionSchema>;

// Used to sanitize the CV versions list page's searchParams (untrusted input
// per CODE_STYLE.md "Security"). Falls back to sane defaults instead of
// erroring, since a malformed page/limit in the URL shouldn't break a read.
export const listCVVersionsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
});
export type ListCVVersionsInput = z.infer<typeof listCVVersionsSchema>;
