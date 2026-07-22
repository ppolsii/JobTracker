"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import {
  archiveCompanySchema,
  createCompanySchema,
  restoreCompanySchema,
  updateCompanySchema,
} from "@/features/companies/schemas/company.schema";
import { CompanyService } from "@/features/companies/services/company.service";
import type { Company } from "@/features/companies/types/company.types";
import { AuthService } from "@/features/auth/services/auth.service";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createCompanyAction(
  input: unknown
): Promise<ActionResult<Company>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CompanyService.create(auth.data, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.COMPANIES);
  }
  return result;
}

export async function updateCompanyAction(
  input: unknown
): Promise<ActionResult<Company>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, ...fields } = parsed.data;
  const result = await CompanyService.update(auth.data, id, fields);
  if (result.success) {
    revalidatePath(ROUTES.COMPANIES);
  }
  return result;
}

export async function archiveCompanyAction(
  input: unknown
): Promise<ActionResult<Company>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = archiveCompanySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CompanyService.archive(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.COMPANIES);
  }
  return result;
}

export async function restoreCompanyAction(
  input: unknown
): Promise<ActionResult<Company>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = restoreCompanySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CompanyService.restore(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.COMPANIES);
  }
  return result;
}
