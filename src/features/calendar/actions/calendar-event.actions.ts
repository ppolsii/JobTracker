"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import {
  archiveCalendarEventSchema,
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "@/features/calendar/schemas/calendar.schema";
import { CalendarService } from "@/features/calendar/services/calendar.service";
import type { CalendarEventRecord } from "@/features/calendar/types/calendar.types";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

export async function createCalendarEventAction(
  input: unknown
): Promise<ActionResult<CalendarEventRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = createCalendarEventSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CalendarService.createCustomEvent(auth.data, parsed.data);
  if (result.success) {
    revalidatePath(ROUTES.CALENDAR);
  }
  return result;
}

export async function updateCalendarEventAction(
  input: unknown
): Promise<ActionResult<CalendarEventRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = updateCalendarEventSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CalendarService.updateCustomEvent(
    auth.data,
    parsed.data.id,
    parsed.data
  );
  if (result.success) {
    revalidatePath(ROUTES.CALENDAR);
  }
  return result;
}

export async function archiveCalendarEventAction(
  input: unknown
): Promise<ActionResult<CalendarEventRecord>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const parsed = archiveCalendarEventSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await CalendarService.archiveCustomEvent(auth.data, parsed.data.id);
  if (result.success) {
    revalidatePath(ROUTES.CALENDAR);
  }
  return result;
}
