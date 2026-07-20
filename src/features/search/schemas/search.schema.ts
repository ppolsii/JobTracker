import { z } from "zod";

// Matches listApplicationsSchema's `query` field exactly (application.schema.ts)
// - same untrusted-input shape, same trim+max-length sanitisation.
export const searchSchema = z.object({
  query: z.string().trim().max(255),
});
export type SearchInput = z.infer<typeof searchSchema>;
