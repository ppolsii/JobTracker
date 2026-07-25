"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { notificationKeySchema } from "@/features/notifications/schemas/notification.schema";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { validationError } from "@/shared/utils/action-result";
import type { ActionResult } from "@/types/action-result";

// Every action below needs both the user id (like every other feature's
// `AuthService.requireUserId()`) and `created_at` (for the "Welcome"
// notification's account-age check, NotificationService's only dependency
// outside Calendar/Goals) - `requireUserId()` alone only returns the id, so
// this reads the full user object directly instead, mirroring exactly what
// `requireUserId()` itself does internally.
async function requireAuthenticatedUser(): Promise<
  ActionResult<{ id: string; createdAt: string }>
> {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: { message: "You must be logged in.", code: ERROR_CODES.UNAUTHENTICATED },
    };
  }
  return { success: true, data: { id: user.id, createdAt: user.created_at } };
}

export async function markNotificationReadAction(
  input: unknown
): Promise<ActionResult<true>> {
  const auth = await requireAuthenticatedUser();
  if (!auth.success) return auth;

  const parsed = notificationKeySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await NotificationService.markAsRead(auth.data.id, parsed.data.key);
  if (result.success) {
    revalidatePath(ROUTES.NOTIFICATIONS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<true>> {
  const auth = await requireAuthenticatedUser();
  if (!auth.success) return auth;

  const result = await NotificationService.markAllAsRead(auth.data.id, auth.data.createdAt);
  if (result.success) {
    revalidatePath(ROUTES.NOTIFICATIONS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

export async function archiveNotificationAction(
  input: unknown
): Promise<ActionResult<true>> {
  const auth = await requireAuthenticatedUser();
  if (!auth.success) return auth;

  const parsed = notificationKeySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await NotificationService.archiveNotification(auth.data.id, parsed.data.key);
  if (result.success) {
    revalidatePath(ROUTES.NOTIFICATIONS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

export async function deleteNotificationAction(
  input: unknown
): Promise<ActionResult<true>> {
  const auth = await requireAuthenticatedUser();
  if (!auth.success) return auth;

  const parsed = notificationKeySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await NotificationService.deleteNotification(auth.data.id, parsed.data.key);
  if (result.success) {
    revalidatePath(ROUTES.NOTIFICATIONS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}

export async function deleteAllReadNotificationsAction(): Promise<ActionResult<true>> {
  const auth = await requireAuthenticatedUser();
  if (!auth.success) return auth;

  const result = await NotificationService.deleteAllRead(auth.data.id, auth.data.createdAt);
  if (result.success) {
    revalidatePath(ROUTES.NOTIFICATIONS);
    revalidatePath(ROUTES.DASHBOARD);
  }
  return result;
}
