import type {
  NotificationCategory,
  NotificationGroupKey,
} from "@/features/notifications/types/notification.types";

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  application: "Application",
  interview: "Interview",
  goal: "Goal",
  achievement: "Achievement",
  calendar: "Calendar",
  general: "General",
};

export const NOTIFICATION_CATEGORY_OPTIONS: NotificationCategory[] = [
  "application",
  "interview",
  "goal",
  "achievement",
  "calendar",
  "general",
];

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  older: "Older",
};

// "APPLICATION": three severity tiers over one continuous "days since last
// activity" measurement - no numeric spec was given for any of the three
// (only the flow "10 days -> no response -> suggest follow-up" and one
// example, "12 days"), so these are documented, deliberate thresholds
// (mirroring Advanced Analytics' own precedent of naming an undocumented
// sample-size threshold rather than leaving it implicit), not fabricated
// business rules. Only the highest tier reached fires, so a single stale
// application never shows more than one Application notification at once.
export const APPLICATION_BECOMING_STALE_DAYS = 7;
export const APPLICATION_NO_ACTIVITY_DAYS = 14;
export const APPLICATION_FOLLOW_UP_DAYS = 21;

// "CALENDAR": "Upcoming event" looks this many days ahead (inclusive of
// tomorrow, exclusive of today - today's events are their own, separate
// "Today's events" type).
export const UPCOMING_EVENT_WINDOW_DAYS = 7;

// "GOALS": "Goal deadline approaching" fires once a goal's current period
// ends within this many days. "You're close to reaching your weekly goal"
// reuses the exact 0.8 ratio Phase 31.5's Usage Indicator warning already
// established, rather than inventing a second "approaching" threshold.
export const GOAL_DEADLINE_APPROACHING_DAYS = 2;
export const GOAL_CLOSE_TO_TARGET_RATIO = 0.8;

// "GENERAL - Welcome": shown only within this many days of account
// creation (`auth.users.created_at`, already available from
// AuthService.getCurrentUser() - no new query) - a welcome message shown
// forever to a year-old account would be a stale, dishonest greeting.
export const WELCOME_WINDOW_DAYS = 14;
