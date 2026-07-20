"use server";

import { revalidatePath } from "next/cache";

import { applicationDetailRoute } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  archiveApplicationNoteSchema,
  createApplicationNoteSchema,
  updateApplicationNoteSchema,
} from "@/features/applications/schemas/application.schema";
import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import type { ApplicationNote } from "@/features/applications/types/application.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createApplicationNoteAction(
  input: unknown
): Promise<ActionResult<ApplicationNote>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createApplicationNoteSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationNoteService.create(
    auth.data,
    parsed.data.application_id,
    parsed.data.content
  );
  if (result.success) {
    revalidatePath(applicationDetailRoute(parsed.data.application_id));
  }
  return result;
}

export async function updateApplicationNoteAction(
  input: unknown
): Promise<ActionResult<ApplicationNote>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateApplicationNoteSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationNoteService.update(
    auth.data,
    parsed.data.id,
    parsed.data.content
  );
  if (result.success) {
    revalidatePath(applicationDetailRoute(result.data.application_id));
  }
  return result;
}

export async function archiveApplicationNoteAction(
  input: unknown
): Promise<ActionResult<ApplicationNote>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = archiveApplicationNoteSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await ApplicationNoteService.archive(
    auth.data,
    parsed.data.id
  );
  if (result.success) {
    revalidatePath(applicationDetailRoute(result.data.application_id));
  }
  return result;
}
