"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  archiveApplicationSchema,
  createApplicationSchema,
  restoreApplicationSchema,
  updateApplicationSchema,
} from "@/features/applications/schemas/application.schema";
import { ApplicationService } from "@/features/applications/services/application.service";
import type { Application } from "@/features/applications/types/application.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createApplicationAction(
  input: unknown
): Promise<ActionResult<Application>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationService.create(auth.data, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.APPLICATIONS);
  }
  return result;
}

export async function updateApplicationAction(
  input: unknown
): Promise<ActionResult<Application>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, ...fields } = parsed.data;
  const result = await ApplicationService.update(auth.data, id, fields);
  if (result.success) {
    revalidatePath(ROUTES.APPLICATIONS);
  }
  return result;
}

export async function archiveApplicationAction(
  input: unknown
): Promise<ActionResult<Application>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = archiveApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationService.archive(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.APPLICATIONS);
  }
  return result;
}

export async function restoreApplicationAction(
  input: unknown
): Promise<ActionResult<Application>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = restoreApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationService.restore(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.APPLICATIONS);
  }
  return result;
}
