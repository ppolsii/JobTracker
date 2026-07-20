"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { updateProfileSchema } from "@/features/users/schemas/user.schema";
import { UserService } from "@/features/users/services/user.service";
import type { User } from "@/features/users/types/user.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function updateProfileAction(
  input: unknown
): Promise<ActionResult<User>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await UserService.updateProfile(
    auth.data,
    parsed.data.fullName
  );
  if (result.success) {
    revalidatePath(ROUTES.SETTINGS);
  }
  return result;
}
