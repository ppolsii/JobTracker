"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  archiveCVVersionSchema,
  createCVVersionSchema,
  getCVDownloadUrlSchema,
  restoreCVVersionSchema,
  updateCVVersionSchema,
} from "@/features/cv/schemas/cv-version.schema";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

// Phase 40 (CV Library): a `File` can only travel to a Server Action inside
// FormData, not plain JSON - so these two actions take FormData instead of
// `unknown` (unlike every other action in this codebase). Metadata fields
// still validate through the exact same Zod schemas as before; the file
// itself is validated by CVVersionService (see validateCVFile), since "must
// be a real PDF under 5MB" is a business rule, not input shape validation.
export async function createCVVersionAction(
  formData: FormData
): Promise<ActionResult<CVVersion>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createCVVersionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return validationError("Select a PDF file to upload.");
  }

  const result = await CVVersionService.create(auth.data, parsed.data, file);
  if (result.success) {
    revalidatePath(ROUTES.CV_VERSIONS);
  }
  return result;
}

export async function updateCVVersionAction(
  formData: FormData
): Promise<ActionResult<CVVersion>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateCVVersionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const file = formData.get("file");
  const { id, ...fields } = parsed.data;
  const result = await CVVersionService.update(
    auth.data,
    id,
    fields,
    file instanceof File && file.size > 0 ? file : undefined
  );
  if (result.success) {
    revalidatePath(ROUTES.CV_VERSIONS);
  }
  return result;
}

export async function getCVDownloadUrlAction(
  input: unknown
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = getCVDownloadUrlSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return CVVersionService.getDownloadUrl(auth.data, parsed.data.id);
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

export async function restoreCVVersionAction(
  input: unknown
): Promise<ActionResult<CVVersion>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = restoreCVVersionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CVVersionService.restore(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.CV_VERSIONS);
  }
  return result;
}
