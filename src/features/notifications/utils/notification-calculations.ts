import { applicationDetailRoute, ROUTES } from "@/config/routes";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import {
  APPLICATION_BECOMING_STALE_DAYS,
  APPLICATION_FOLLOW_UP_DAYS,
  APPLICATION_NO_ACTIVITY_DAYS,
  GOAL_CLOSE_TO_TARGET_RATIO,
  GOAL_DEADLINE_APPROACHING_DAYS,
  NOTIFICATION_GROUP_LABELS,
  UPCOMING_EVENT_WINDOW_DAYS,
  WELCOME_WINDOW_DAYS,
} from "@/features/notifications/constants/notification.constants";
import type {
  GroupedNotifications,
  Notification,
  NotificationFilters,
  NotificationGroupKey,
  NotificationStateRecord,
} from "@/features/notifications/types/notification.types";
import type {
  AchievementState,
  GoalWithProgress,
} from "@/features/goals/types/goal.types";
import { getGoalDisplayTitle } from "@/features/goals/utils/goal-calculations";
import type { ApplicationStatusHistoryEntry } from "@/features/applications/types/application.types";

// Pure calculation helpers for the Notification Center & Smart Reminders
// (IMPLEMENTATION_ORDER_V2.md Phase 36) - no Supabase access, no I/O.
// NotificationService is the only caller. Every generator below reads
// already-computed data from CalendarService/GoalService (which themselves
// already reuse Application/Status History/Achievement infrastructure) -
// nothing here re-derives a metric or scheduling rule those features don't
// already expose. "Never fabricate recommendations, use only existing
// data" - every notification's `timestamp` is a real, existing date already
// present on the source data (a status-history date, an event date, an
// achievement's unlock date), never invented.

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateKey(d);
}

function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const fromMs = new Date(`${fromKey}T00:00:00.000Z`).getTime();
  const toMs = new Date(`${toKey}T00:00:00.000Z`).getTime();
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

// One entry per application: the most recent application_status_history
// `changed_at` recorded for it - "no activity since" needs the latest
// transition of ANY kind, unlike ApplicationHistoryFacts (Phase 29/33),
// which only tracks specific NAMED stage timestamps. A genuinely new, small
// calculation - no earlier phase needed "last change regardless of stage."
export function buildLastChangeDateByApplication(
  history: ApplicationStatusHistoryEntry[]
): Map<string, string> {
  const lastChange = new Map<string, string>();
  for (const entry of history) {
    const current = lastChange.get(entry.application_id);
    if (!current || entry.changed_at > current) {
      lastChange.set(entry.application_id, entry.changed_at);
    }
  }
  return lastChange;
}

// "APPLICATION": one notification per stale, still-open application (an
// `application_submitted` event exists for every application that has been
// applied to - `deriveStatusHistoryEvents`, Phase 34 - and already carries
// company/position/status). Only the highest severity tier reached fires.
export function buildApplicationNotifications(
  events: CalendarEvent[],
  history: ApplicationStatusHistoryEntry[],
  today: Date
): Notification[] {
  const lastChangeByApplication = buildLastChangeDateByApplication(history);
  const todayKey = toDateKey(today);
  const OPEN_STATUSES = new Set([
    "Applied",
    "Recruiter Contact",
    "HR Interview",
    "Technical Interview",
    "Final Interview",
    "Offer",
  ]);

  const notifications: Notification[] = [];

  for (const event of events) {
    if (event.type !== "application_submitted" || !event.applicationId) continue;
    if (!event.applicationStatus || !OPEN_STATUSES.has(event.applicationStatus)) continue;

    const lastChangeAt =
      lastChangeByApplication.get(event.applicationId) ?? `${event.date}T00:00:00.000Z`;
    const daysSince = daysBetweenDateKeys(lastChangeAt.slice(0, 10), todayKey);

    const company = event.companyName ?? "this company";
    const action = { label: "Open application", href: applicationDetailRoute(event.applicationId) };

    if (daysSince >= APPLICATION_FOLLOW_UP_DAYS) {
      notifications.push({
        key: `application:follow_up_recommended:${event.applicationId}`,
        category: "application",
        type: "follow_up_recommended",
        title: "Follow-up recommended",
        description: `It's been ${daysSince} days since you applied to ${company}. Consider following up.`,
        timestamp: lastChangeAt,
        status: "unread",
        action,
        applicationId: event.applicationId,
        companyId: event.companyId,
        companyName: event.companyName,
      });
    } else if (daysSince >= APPLICATION_NO_ACTIVITY_DAYS) {
      notifications.push({
        key: `application:no_activity:${event.applicationId}`,
        category: "application",
        type: "no_activity",
        title: `No activity for ${daysSince} days`,
        description: `You applied to ${company} ${daysSince} days ago with no update since.`,
        timestamp: lastChangeAt,
        status: "unread",
        action,
        applicationId: event.applicationId,
        companyId: event.companyId,
        companyName: event.companyName,
      });
    } else if (daysSince >= APPLICATION_BECOMING_STALE_DAYS) {
      notifications.push({
        key: `application:becoming_stale:${event.applicationId}`,
        category: "application",
        type: "becoming_stale",
        title: "Application becoming stale",
        description: `You applied to ${company} ${daysSince} days ago. It may be time for a follow-up soon.`,
        timestamp: lastChangeAt,
        status: "unread",
        action,
        applicationId: event.applicationId,
        companyId: event.companyId,
        companyName: event.companyName,
      });
    }
  }

  return notifications;
}

const INTERVIEW_EVENT_TYPES = new Set(["interview", "technical_interview", "final_interview"]);

// "INTERVIEW": "Interview in one hour" is deliberately not implemented -
// event_date is a date, not a timestamp, so this application has no
// time-of-day data to honestly base an hourly reminder on (documented
// exclusion, not an oversight).
export function buildInterviewNotifications(
  events: CalendarEvent[],
  today: Date
): Notification[] {
  const todayKey = toDateKey(today);
  const tomorrowKey = addDays(todayKey, 1);

  const notifications: Notification[] = [];

  for (const event of events) {
    if (!INTERVIEW_EVENT_TYPES.has(event.type)) continue;
    if (event.date !== todayKey && event.date !== tomorrowKey) continue;

    const isToday = event.date === todayKey;
    const subject = event.position ? `${event.position} at ${event.companyName ?? "this company"}` : "Your interview";

    notifications.push({
      key: `interview:${isToday ? "today" : "tomorrow"}:${event.applicationStatusHistoryId ?? event.id}`,
      category: "interview",
      type: isToday ? "interview_today" : "interview_tomorrow",
      title: isToday ? "Interview today" : "Interview tomorrow",
      description: `${subject} - interview ${isToday ? "today" : "tomorrow"}.`,
      timestamp: `${event.date}T00:00:00.000Z`,
      status: "unread",
      action: event.applicationId
        ? { label: "Open application", href: applicationDetailRoute(event.applicationId) }
        : { label: "Open calendar", href: ROUTES.CALENDAR },
      applicationId: event.applicationId,
      companyId: event.companyId,
      companyName: event.companyName,
    });
  }

  return notifications;
}

// "CALENDAR": every other event type - interview-type events already have
// their own dedicated category above, and re-surfacing them here too would
// show the same underlying event twice under two different notifications.
const CALENDAR_CATEGORY_EVENT_TYPES = new Set([
  "recruiter_contact",
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "rejected",
  "reminder",
  "custom",
]);

export function buildCalendarNotifications(events: CalendarEvent[], today: Date): Notification[] {
  const todayKey = toDateKey(today);
  const windowEnd = addDays(todayKey, UPCOMING_EVENT_WINDOW_DAYS);

  const notifications: Notification[] = [];

  for (const event of events) {
    if (!CALENDAR_CATEGORY_EVENT_TYPES.has(event.type)) continue;

    const isToday = event.date === todayKey;
    const isUpcoming = !isToday && event.date > todayKey && event.date <= windowEnd;
    if (!isToday && !isUpcoming) continue;

    notifications.push({
      key: `calendar:${isToday ? "todays_event" : "upcoming_event"}:${event.id}`,
      category: "calendar",
      type: isToday ? "todays_event" : "upcoming_event",
      title: isToday ? "Today's event" : "Upcoming event",
      description: event.title,
      timestamp: `${event.date}T00:00:00.000Z`,
      status: "unread",
      action: event.applicationId
        ? { label: "Open application", href: applicationDetailRoute(event.applicationId) }
        : { label: "Open calendar", href: ROUTES.CALENDAR },
      applicationId: event.applicationId,
      companyId: event.companyId,
      companyName: event.companyName,
    });
  }

  return notifications;
}

// "GOALS": reuses each goal's already-computed GoalProgress (GoalService)
// wholesale - no metric is recalculated here. Only one notification fires
// per goal (priority: completed > behind schedule > deadline approaching >
// close to target), so a single goal never shows overlapping notifications
// at once.
export function buildGoalNotifications(
  goalsWithProgress: GoalWithProgress[],
  today: Date
): Notification[] {
  const todayKey = toDateKey(today);
  const notifications: Notification[] = [];

  for (const { goal, progress } of goalsWithProgress) {
    if (goal.status !== "active") continue;

    const title = getGoalDisplayTitle(goal);
    const action = { label: "Open goals", href: ROUTES.GOALS };

    if (progress.isCompleted && goal.period === "weekly") {
      notifications.push({
        key: `goal:weekly_completed:${goal.id}:${progress.periodEnd ?? ""}`,
        category: "goal",
        type: "weekly_goal_completed",
        title: "Weekly goal completed!",
        description: `You reached your ${title} goal (${progress.current}/${progress.target}).`,
        timestamp: `${todayKey}T00:00:00.000Z`,
        status: "unread",
        action,
      });
      continue;
    }

    if (progress.isCompleted) continue;

    if (
      progress.periodEnd &&
      progress.estimatedCompletionDate &&
      progress.estimatedCompletionDate > progress.periodEnd
    ) {
      notifications.push({
        key: `goal:behind_schedule:${goal.id}:${progress.periodStart}`,
        category: "goal",
        type: "goal_behind_schedule",
        title: "Goal behind schedule",
        description: `At your current pace, you may not reach your ${title} goal (${progress.current}/${progress.target}) by ${progress.periodEnd}.`,
        timestamp: `${todayKey}T00:00:00.000Z`,
        status: "unread",
        action,
      });
      continue;
    }

    if (
      progress.periodEnd &&
      daysBetweenDateKeys(todayKey, progress.periodEnd) >= 0 &&
      daysBetweenDateKeys(todayKey, progress.periodEnd) <= GOAL_DEADLINE_APPROACHING_DAYS
    ) {
      notifications.push({
        key: `goal:deadline_approaching:${goal.id}:${progress.periodEnd}`,
        category: "goal",
        type: "goal_deadline_approaching",
        title: "Goal deadline approaching",
        description: `Your ${title} goal ends ${progress.periodEnd} - you're at ${progress.current}/${progress.target} (${progress.percentage}%).`,
        timestamp: `${todayKey}T00:00:00.000Z`,
        status: "unread",
        action,
      });
      continue;
    }

    if (progress.target > 0 && progress.current / progress.target >= GOAL_CLOSE_TO_TARGET_RATIO) {
      notifications.push({
        key: `goal:close_to_target:${goal.id}:${progress.periodStart}`,
        category: "goal",
        type: "goal_close_to_target",
        title: "Almost there!",
        description: `You're close to reaching your ${title} goal - ${progress.remaining} more to go (${progress.percentage}%).`,
        timestamp: `${todayKey}T00:00:00.000Z`,
        status: "unread",
        action,
      });
    }
  }

  return notifications;
}

// "ACHIEVEMENTS": one permanent notification per unlocked achievement,
// keyed by its key alone (no date component) - since an achievement never
// re-unlocks, there is exactly one notification for it, ever.
export function buildAchievementNotifications(achievements: AchievementState[]): Notification[] {
  return achievements
    .filter((achievement) => achievement.unlocked && achievement.unlockedAt)
    .map((achievement) => ({
      key: `achievement:unlocked:${achievement.definition.key}`,
      category: "achievement" as const,
      type: "achievement_unlocked",
      title: `Achievement unlocked: ${achievement.definition.label}`,
      description: achievement.definition.description,
      timestamp: achievement.unlockedAt as string,
      status: "unread" as const,
      action: { label: "Open goals", href: ROUTES.GOALS },
    }));
}

// "GENERAL": the only two categories that read data outside Calendar/Goals -
// `userCreatedAt` is already returned by AuthService.getCurrentUser() (no
// new query); "no goals yet" reuses the same goalsWithProgress list every
// other builder above already has.
export function buildGeneralNotifications(
  userCreatedAt: string,
  hasAnyGoals: boolean,
  today: Date
): Notification[] {
  const todayKey = toDateKey(today);
  const notifications: Notification[] = [];

  if (daysBetweenDateKeys(userCreatedAt.slice(0, 10), todayKey) <= WELCOME_WINDOW_DAYS) {
    notifications.push({
      key: "general:welcome",
      category: "general",
      type: "welcome",
      title: "Welcome to JobTracker Insights",
      description: "Track every application, set a goal, and get smart reminders - all in one place.",
      timestamp: userCreatedAt,
      status: "unread",
    });
  }

  if (!hasAnyGoals) {
    notifications.push({
      key: "general:tip_set_a_goal",
      category: "general",
      type: "tip",
      title: "Tip: set a goal",
      description: "Set a weekly or monthly goal to stay consistent and track your progress automatically.",
      timestamp: `${todayKey}T00:00:00.000Z`,
      status: "unread",
      action: { label: "Open goals", href: ROUTES.GOALS },
    });
  }

  return notifications;
}

export function buildNotifications(context: {
  events: CalendarEvent[];
  history: ApplicationStatusHistoryEntry[];
  goalsWithProgress: GoalWithProgress[];
  achievements: AchievementState[];
  userCreatedAt: string;
  today: Date;
}): Notification[] {
  const { events, history, goalsWithProgress, achievements, userCreatedAt, today } = context;

  return [
    ...buildApplicationNotifications(events, history, today),
    ...buildInterviewNotifications(events, today),
    ...buildCalendarNotifications(events, today),
    ...buildGoalNotifications(goalsWithProgress, today),
    ...buildAchievementNotifications(achievements),
    ...buildGeneralNotifications(userCreatedAt, goalsWithProgress.length > 0, today),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Attaches persisted read/archived/deleted state (defaulting to "unread"
// when no state row exists yet - the common case for a freshly-generated
// notification the user has never interacted with). A set `deleted_at`
// always wins over whatever the row's own `status` column holds - deletion
// is a separate, orthogonal soft-delete marker (see the repository's own
// comment), not a fourth `status` enum value.
export function mergeNotificationState(
  notifications: Notification[],
  stateRows: Pick<NotificationStateRecord, "notification_key" | "status" | "deleted_at">[]
): Notification[] {
  const stateByKey = new Map(stateRows.map((row) => [row.notification_key, row]));
  return notifications.map((notification) => {
    const state = stateByKey.get(notification.key);
    if (!state) return notification;
    return {
      ...notification,
      status: state.deleted_at ? "deleted" : state.status,
    };
  });
}

export function filterNotifications(
  notifications: Notification[],
  filters: NotificationFilters
): Notification[] {
  const query = filters.query?.trim().toLowerCase();

  return notifications.filter((notification) => {
    if (filters.unreadOnly && notification.status !== "unread") return false;
    if (filters.category && notification.category !== filters.category) return false;
    if (filters.applicationId && notification.applicationId !== filters.applicationId) return false;
    if (filters.companyId && notification.companyId !== filters.companyId) return false;
    if (filters.dateFrom && notification.timestamp.slice(0, 10) < filters.dateFrom) return false;
    if (filters.dateTo && notification.timestamp.slice(0, 10) > filters.dateTo) return false;
    if (query) {
      const haystack = `${notification.title} ${notification.description} ${notification.companyName ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

// "NOTIFICATION CENTER": groups by recency relative to `today` - archived
// and deleted notifications are both excluded from the Notification
// Center's own grouped view (archived is still readable via a dedicated
// "archived" filter/state, never through the default grouped list,
// mirroring how every other archived business entity in this codebase is
// excluded from its default list view; deleted is gone for good).
export function groupNotificationsByRecency(
  notifications: Notification[],
  today: Date
): GroupedNotifications[] {
  const todayKey = toDateKey(today);
  const yesterdayKey = addDays(todayKey, -1);

  const buckets: Record<NotificationGroupKey, Notification[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    older: [],
  };

  for (const notification of notifications) {
    if (notification.status === "archived" || notification.status === "deleted") continue;

    const dateKey = notification.timestamp.slice(0, 10);
    if (dateKey === todayKey) {
      buckets.today.push(notification);
    } else if (dateKey === yesterdayKey) {
      buckets.yesterday.push(notification);
    } else if (daysBetweenDateKeys(dateKey, todayKey) <= 7) {
      buckets.this_week.push(notification);
    } else {
      buckets.older.push(notification);
    }
  }

  return (["today", "yesterday", "this_week", "older"] as NotificationGroupKey[])
    .map((key) => ({ key, label: NOTIFICATION_GROUP_LABELS[key], notifications: buckets[key] }))
    .filter((group) => group.notifications.length > 0);
}

export function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((notification) => notification.status === "unread").length;
}
