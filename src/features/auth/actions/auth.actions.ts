"use server";

import { redirect } from "next/navigation";

import { env } from "@/config/env";
import { ROUTES } from "@/config/routes";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas/auth.schema";
import { AuthService } from "@/features/auth/services/auth.service";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function registerAction(
  input: unknown
): Promise<ActionResult<{ requiresEmailConfirmation: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await AuthService.register(parsed.data);
  if (!result.success) {
    return result;
  }

  if (!result.data.requiresEmailConfirmation) {
    redirect(ROUTES.DASHBOARD);
  }

  return result;
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await AuthService.login(parsed.data);
  if (!result.success) {
    return result;
  }

  redirect(ROUTES.DASHBOARD);
}

export async function logoutAction(): Promise<void> {
  await AuthService.logout();
  redirect(ROUTES.LOGIN);
}

export async function requestPasswordResetAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const redirectTo = `${env.appUrl}${ROUTES.UPDATE_PASSWORD}`;
  return AuthService.requestPasswordReset(parsed.data.email, redirectTo);
}

export async function updatePasswordAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await AuthService.updatePassword(parsed.data.password);
  if (!result.success) {
    return result;
  }

  redirect(ROUTES.LOGIN);
}
