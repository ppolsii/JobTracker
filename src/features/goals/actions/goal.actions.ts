"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from "@/features/goals/schemas/goal.schema";
import { GoalService } from "@/features/goals/services/goal.service";
import type { GoalRecord } from "@/features/goals/types/goal.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createGoalAction(
  input: unknown
): Promise<ActionResult<GoalRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await GoalService.createGoal(auth.data, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.GOALS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

export async function updateGoalAction(
  input: unknown
): Promise<ActionResult<GoalRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await GoalService.updateGoal(auth.data, parsed.data.id, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.GOALS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

async function setStatusAction(
  input: unknown,
  status: "active" | "paused" | "archived"
): Promise<ActionResult<GoalRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = goalIdSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await GoalService.setGoalStatus(auth.data, parsed.data.id, status);
  if (result.success) {
    revalidatePath(ROUTES.GOALS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

export async function pauseGoalAction(input: unknown) {
  return setStatusAction(input, "paused");
}

export async function reactivateGoalAction(input: unknown) {
  return setStatusAction(input, "active");
}

export async function archiveGoalAction(input: unknown) {
  return setStatusAction(input, "archived");
}

export async function deleteGoalAction(
  input: unknown
): Promise<ActionResult<GoalRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = goalIdSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await GoalService.deleteGoal(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.GOALS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}
