"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import type { Application } from "@/features/applications/types/application.types";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  confirmJobImportSchema,
  extractJobUrlSchema,
} from "@/features/job-import/schemas/job-import.schema";
import { JobImportService } from "@/features/job-import/services/job-import.service";
import type { ExtractedJobData } from "@/features/job-import/types/job-import.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

// Workflow step 3 onward: validates the URL's shape here (the Action layer,
// matching every other feature's create/update Actions), then hands off to
// JobImportService for provider selection/extraction/Pro-gating.
export async function extractJobDataAction(
  input: unknown
): Promise<ActionResult<ExtractedJobData & { providerName: string }>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = extractJobUrlSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return JobImportService.extract(auth.data, parsed.data.url);
}

export async function confirmJobImportAction(
  input: unknown
): Promise<ActionResult<Application>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = confirmJobImportSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await JobImportService.confirmImport(auth.data, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.APPLICATIONS);
  }
  return result;
}
