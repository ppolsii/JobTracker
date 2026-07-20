"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  archiveCVVersionSchema,
  createCVVersionSchema,
  updateCVVersionSchema,
} from "@/features/cv/schemas/cv-version.schema";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createCVVersionAction(
  input: unknown
): Promise<ActionResult<CVVersion>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createCVVersionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CVVersionService.create(auth.data, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.CV_VERSIONS);
  }
  return result;
}

export async function updateCVVersionAction(
  input: unknown
): Promise<ActionResult<CVVersion>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateCVVersionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, ...fields } = parsed.data;
  const result = await CVVersionService.update(auth.data, id, fields);
  if (result.success) {
    revalidatePath(ROUTES.CV_VERSIONS);
  }
  return result;
}

export async function archiveCVVersionAction(
  input: unknown
): Promise<ActionResult<CVVersion>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = archiveCVVersionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CVVersionService.archive(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.CV_VERSIONS);
  }
  return result;
}
