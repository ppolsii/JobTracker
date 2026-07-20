"use server";

import { revalidatePath } from "next/cache";

import { applicationDetailRoute, ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { changeApplicationStatusSchema } from "@/features/applications/schemas/application.schema";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function changeApplicationStatusAction(
  input: unknown
): Promise<ActionResult<ApplicationWithRelations>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = changeApplicationStatusSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationStatusService.changeStatus(
    auth.data,
    parsed.data.id,
    parsed.data.new_status,
    parsed.data.application_date
  );

  if (result.success) {
    revalidatePath(ROUTES.APPLICATIONS);
    revalidatePath(applicationDetailRoute(parsed.data.id));
  }

  return result;
}
