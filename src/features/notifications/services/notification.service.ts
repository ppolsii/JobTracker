import { CalendarService } from "@/features/calendar/services/calendar.service";
import { GoalService } from "@/features/goals/services/goal.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { NotificationRepository } from "@/features/notifications/repositories/notification.repository";
import type {
  Notification,
  NotificationFilters,
  NotificationsPageData,
} from "@/features/notifications/types/notification.types";
import {
  buildNotifications,
  computeUnreadCount,
  filterNotifications,
  groupNotificationsByRecency,
  mergeNotificationState,
} from "@/features/notifications/utils/notification-calculations";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER_V2.md Phase 36 (Notification Center & Smart
// Reminders). Owns the whole Notification workflow - Pro-gating, generation,
// state merging, filtering, and grouping - Repository stays data-access
// only. Depends on exactly two other Services: CalendarService.getEvents
// (already merges derived status-history events, custom events, and goal-
// deadline events - "no duplicated scheduling logic") and
// GoalService.getGoalsPageData (already computes progress and unlocks
// achievements - "reuse GoalService"/"reuse AchievementService"). No new
// Repository beyond notification_states' own state-only table.
//
// Performance note (documented, not silently assumed): every method here
// re-runs the full generation (both dependencies' own bulk fetches) since
// notification *content* is never cached (see the migration's header
// comment) - this mirrors the same per-page-load cost every other
// Pro-gated feature in this codebase already accepts (Calendar/Goals/
// Advanced Analytics each independently bulk-fetch on their own page load).
// A future phase could add caching if this proves too slow in practice.
async function loadNotifications(
  userId: string,
  userCreatedAt: string,
  today: Date
): Promise<ActionResult<Notification[]>> {
  const [calendarResult, goalsResult, stateResult] = await Promise.all([
    CalendarService.getEvents(userId, {}),
    GoalService.getGoalsPageData(userId, today),
    NotificationRepository.listStatesForUser(userId),
  ]);

  if (!calendarResult.success) return calendarResult;
  if (!goalsResult.success) return goalsResult;
  if (stateResult.error) {
    return {
      success: false,
      error: {
        message: "Something went wrong while loading notifications.",
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    };
  }

  const generated = buildNotifications({
    events: calendarResult.data.events,
    history: calendarResult.data.history,
    goalsWithProgress: goalsResult.data.goalsWithProgress,
    achievements: goalsResult.data.achievements,
    userCreatedAt,
    today,
  });

  return {
    success: true,
    data: mergeNotificationState(generated, stateResult.data ?? []),
  };
}

export const NotificationService = {
  // "PRO ACCESS": reuses BillingService.requireProPlan - the same check
  // every other Pro-only feature in this codebase already uses.
  async getNotifications(
    userId: string,
    userCreatedAt: string,
    filters: NotificationFilters,
    today: Date = new Date()
  ): Promise<ActionResult<NotificationsPageData>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const notifications = await loadNotifications(userId, userCreatedAt, today);
    if (!notifications.success) return notifications;

    const unreadCount = computeUnreadCount(notifications.data);
    const filtered = filterNotifications(notifications.data, filters);

    return {
      success: true,
      data: {
        groups: groupNotificationsByRecency(filtered, today),
        unreadCount,
        totalCount: notifications.data.length,
      },
    };
  },

  // "DASHBOARD"/"nav bell badge": a lighter read than getNotifications
  // (only the pieces the number/preview needs), but the underlying
  // generation cost is unavoidable - see loadNotifications' own note.
  async getUnreadCount(
    userId: string,
    userCreatedAt: string,
    today: Date = new Date()
  ): Promise<ActionResult<number>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const notifications = await loadNotifications(userId, userCreatedAt, today);
    if (!notifications.success) return notifications;

    return { success: true, data: computeUnreadCount(notifications.data) };
  },

  async markAsRead(userId: string, key: string): Promise<ActionResult<true>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { error } = await NotificationRepository.upsertStatus(userId, key, "read");
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while updating the notification.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
    return { success: true, data: true };
  },

  async markAllAsRead(
    userId: string,
    userCreatedAt: string,
    today: Date = new Date()
  ): Promise<ActionResult<true>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const notifications = await loadNotifications(userId, userCreatedAt, today);
    if (!notifications.success) return notifications;

    const unreadKeys = notifications.data
      .filter((notification) => notification.status === "unread")
      .map((notification) => notification.key);

    const { error } = await NotificationRepository.upsertManyStatus(userId, unreadKeys, "read");
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while updating notifications.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
    return { success: true, data: true };
  },

  async archiveNotification(userId: string, key: string): Promise<ActionResult<true>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { error } = await NotificationRepository.upsertStatus(userId, key, "archived");
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while archiving the notification.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
    return { success: true, data: true };
  },

  // "Delete notification" - distinct from Archive (a soft delete, not a
  // status change).
  async deleteNotification(userId: string, key: string): Promise<ActionResult<true>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { error } = await NotificationRepository.softDelete(userId, key);
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while deleting the notification.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
    return { success: true, data: true };
  },

  async deleteAllRead(
    userId: string,
    userCreatedAt: string,
    today: Date = new Date()
  ): Promise<ActionResult<true>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const notifications = await loadNotifications(userId, userCreatedAt, today);
    if (!notifications.success) return notifications;

    const readKeys = notifications.data
      .filter((notification) => notification.status === "read")
      .map((notification) => notification.key);

    const { error } = await NotificationRepository.softDeleteMany(userId, readKeys);
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while deleting notifications.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
    return { success: true, data: true };
  },
};
