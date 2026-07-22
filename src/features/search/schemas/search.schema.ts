import { z } from "zod";

// Matches listApplicationsSchema's `query` field exactly (application.schema.ts)
// - same untrusted-input shape, same trim+max-length sanitisation.
export const searchSchema = z.object({
  query: z.string().trim().max(255),
});
export type SearchInput = z.infer<typeof searchSchema>;

// IMPLEMENTATION_ORDER_V2.md Phase 27: sanitizes the dedicated Search
// page's searchParams (untrusted input per CODE_STYLE.md "Security"),
// mirroring listCompaniesSchema's fallback-instead-of-error approach for
// pagination. A separate schema from `searchSchema` above (used to
// validate the dropdown's Server Action input) since the input source and
// shape differ - URL query-string values needing coercion, plus three
// independent per-entity page numbers the dropdown never needs.
export const searchPageSchema = z.object({
  query: z.string().trim().max(255).optional(),
  companiesPage: z.coerce.number().int().min(1).catch(1),
  applicationsPage: z.coerce.number().int().min(1).catch(1),
  notesPage: z.coerce.number().int().min(1).catch(1),
});
export type SearchPageInput = z.infer<typeof searchPageSchema>;
