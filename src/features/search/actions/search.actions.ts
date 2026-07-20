"use server";

import { AuthService } from "@/features/auth/services/auth.service";
import { searchSchema } from "@/features/search/schemas/search.schema";
import { SearchService } from "@/features/search/services/search.service";
import type { SearchResults } from "@/features/search/types/search.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

// Called directly from GlobalSearch (a client component in the always-
// mounted TopNav), not from a form submission - there is nothing to
// revalidate, since Search only reads existing data (BUSINESS_RULES.md
// "Search must never redefine business rules" / "Search returns existing
// data").
export async function searchAction(
  input: unknown
): Promise<ActionResult<SearchResults>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return SearchService.search(auth.data, parsed.data.query);
}
