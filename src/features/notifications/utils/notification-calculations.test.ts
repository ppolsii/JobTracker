import { describe, expect, it } from "vitest";

import type { CalendarEvent, CalendarEventType } from "@/features/calendar/types/calendar.types";
import type { ApplicationStatusHistoryEntry } from "@/features/applications/types/application.types";
import type { GoalRecord, GoalWithProgress, AchievementState } from "@/features/goals/types/goal.types";
import {
  APPLICATION_BECOMING_STALE_DAYS,
  APPLICATION_FOLLOW_UP_DAYS,
  APPLICATION_NO_ACTIVITY_DAYS,
} from "@/features/notifications/constants/notification.constants";
import {
  buildAchievementNotifications,
  buildApplicationNotifications,
  buildCalendarNotifications,
  buildGeneralNotifications,
  buildGoalNotifications,
  buildInterviewNotifications,
  buildLastChangeDateByApplication,
  buildNotifications,
  computeUnreadCount,
  filterNotifications,
  groupNotificationsByRecency,
  mergeNotificationState,
} from "@/features/notifications/utils/notification-calculations";
import type { Notification } from "@/features/notifications/types/notification.types";

function calendarEvent(overrides: Partial<CalendarEvent> & { id: string; type: CalendarEventType; date: string }): CalendarEvent {
  return {
    title: "Backend Engineer",
    applicationId: null,
    applicationStatusHistoryId: null,
    companyId: null,
    companyName: null,
    position: null,
    description: null,
    workMode: null,
    employmentType: null,
    applicationStatus: null,
    isCustom: false,
    ...overrides,
  };
}

function historyEntry(
  overrides: Partial<ApplicationStatusHistoryEntry> & {
    application_id: string;
    changed_at: string;
  }
): ApplicationStatusHistoryEntry {
  return {
    id: "history-entry",
    previous_status: null,
    new_status: "Applied",
    created_by: "user-1",
    ...overrides,
  };
}

function goal(overrides: Partial<GoalRecord> & { id: string }): GoalRecord {
  return {
    user_id: "user-1",
    metric: "applications",
    period: "weekly",
    target_value: 5,
    title: null,
    status: "active",
    completed_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

function progress(overrides: Partial<GoalWithProgress["progress"]> = {}): GoalWithProgress["progress"] {
  return {
    current: 0,
    target: 5,
    remaining: 5,
    percentage: 0,
    estimatedCompletionDate: null,
    periodStart: "2026-01-05",
    periodEnd: "2026-01-11",
    isCompleted: false,
    ...overrides,
  };
}

const TODAY = new Date(Date.UTC(2026, 0, 15)); // 2026-01-15

describe("buildLastChangeDateByApplication", () => {
  it("returns the latest changed_at per application", () => {
    const history = [
      historyEntry({ application_id: "a1", changed_at: "2026-01-01T00:00:00.000Z" }),
      historyEntry({ application_id: "a1", changed_at: "2026-01-05T00:00:00.000Z" }),
      historyEntry({ application_id: "a2", changed_at: "2026-01-03T00:00:00.000Z" }),
    ];

    const result = buildLastChangeDateByApplication(history);
    expect(result.get("a1")).toBe("2026-01-05T00:00:00.000Z");
    expect(result.get("a2")).toBe("2026-01-03T00:00:00.000Z");
  });
});

describe("buildApplicationNotifications", () => {
  function submittedEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return calendarEvent({
      id: "evt-a1",
      type: "application_submitted",
      date: "2026-01-01",
      applicationId: "a1",
      companyId: "c1",
      companyName: "Roche",
      applicationStatus: "Applied",
      ...overrides,
    });
  }

  it("does not fire for an application changed fewer than the 'becoming stale' threshold days ago", () => {
    const events = [submittedEvent()];
    const history = [
      historyEntry({
        application_id: "a1",
        changed_at: `2026-01-${String(15 - (APPLICATION_BECOMING_STALE_DAYS - 1)).padStart(2, "0")}T00:00:00.000Z`,
      }),
    ];
    expect(buildApplicationNotifications(events, history, TODAY)).toEqual([]);
  });

  it("fires 'becoming_stale' at the becoming-stale threshold", () => {
    const events = [submittedEvent()];
    const changedAt = new Date(TODAY.getTime() - APPLICATION_BECOMING_STALE_DAYS * 86400000)
      .toISOString();
    const history = [historyEntry({ application_id: "a1", changed_at: changedAt })];

    const notifications = buildApplicationNotifications(events, history, TODAY);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("becoming_stale");
    expect(notifications[0].key).toBe("application:becoming_stale:a1");
  });

  it("fires 'no_activity' at the no-activity threshold, not 'becoming_stale'", () => {
    const events = [submittedEvent()];
    const changedAt = new Date(TODAY.getTime() - APPLICATION_NO_ACTIVITY_DAYS * 86400000).toISOString();
    const history = [historyEntry({ application_id: "a1", changed_at: changedAt })];

    const notifications = buildApplicationNotifications(events, history, TODAY);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("no_activity");
    expect(notifications[0].title).toBe(`No activity for ${APPLICATION_NO_ACTIVITY_DAYS} days`);
  });

  it("fires 'follow_up_recommended' at the follow-up threshold, exclusively (only one notification per application)", () => {
    const events = [submittedEvent()];
    const changedAt = new Date(TODAY.getTime() - APPLICATION_FOLLOW_UP_DAYS * 86400000).toISOString();
    const history = [historyEntry({ application_id: "a1", changed_at: changedAt })];

    const notifications = buildApplicationNotifications(events, history, TODAY);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("follow_up_recommended");
    expect(notifications[0].description).toContain("Roche");
  });

  it("does not fire for a terminal status (Accepted/Rejected) even if stale", () => {
    const events = [submittedEvent({ applicationStatus: "Accepted" })];
    const changedAt = new Date(TODAY.getTime() - 40 * 86400000).toISOString();
    const history = [historyEntry({ application_id: "a1", changed_at: changedAt })];

    expect(buildApplicationNotifications(events, history, TODAY)).toEqual([]);
  });

  it("falls back to the event's own date when no history entry exists for the application", () => {
    const events = [submittedEvent({ date: "2026-01-01" })];
    const notifications = buildApplicationNotifications(events, [], TODAY);
    // 2026-01-01 -> 2026-01-15 is 14 days -> no_activity tier.
    expect(notifications[0].type).toBe("no_activity");
  });

  it("ignores non-'application_submitted' events", () => {
    const events = [calendarEvent({ id: "e1", type: "reminder", date: "2026-01-01" })];
    expect(buildApplicationNotifications(events, [], TODAY)).toEqual([]);
  });
});

describe("buildInterviewNotifications", () => {
  it("fires 'interview_today' for an interview-type event dated today", () => {
    const events = [
      calendarEvent({
        id: "h1",
        type: "interview",
        date: "2026-01-15",
        applicationId: "a1",
        applicationStatusHistoryId: "h1",
        position: "Backend Engineer",
        companyName: "Acme",
      }),
    ];
    const notifications = buildInterviewNotifications(events, TODAY);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("interview_today");
    expect(notifications[0].description).toContain("Backend Engineer at Acme");
  });

  it("fires 'interview_tomorrow' for a technical_interview event dated tomorrow", () => {
    const events = [
      calendarEvent({ id: "h2", type: "technical_interview", date: "2026-01-16", applicationId: "a1" }),
    ];
    const notifications = buildInterviewNotifications(events, TODAY);
    expect(notifications[0].type).toBe("interview_tomorrow");
  });

  it("ignores an interview-type event neither today nor tomorrow", () => {
    const events = [calendarEvent({ id: "h3", type: "final_interview", date: "2026-01-20", applicationId: "a1" })];
    expect(buildInterviewNotifications(events, TODAY)).toEqual([]);
  });

  it("ignores non-interview event types entirely", () => {
    const events = [calendarEvent({ id: "e1", type: "offer_received", date: "2026-01-15" })];
    expect(buildInterviewNotifications(events, TODAY)).toEqual([]);
  });
});

describe("buildCalendarNotifications", () => {
  it("fires 'todays_event' for a qualifying event type dated today", () => {
    const events = [calendarEvent({ id: "e1", type: "reminder", date: "2026-01-15", title: "Follow up" })];
    const notifications = buildCalendarNotifications(events, TODAY);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("todays_event");
  });

  it("fires 'upcoming_event' within the upcoming-event window", () => {
    const events = [calendarEvent({ id: "e1", type: "custom", date: "2026-01-18" })];
    const notifications = buildCalendarNotifications(events, TODAY);
    expect(notifications[0].type).toBe("upcoming_event");
  });

  it("ignores an event beyond the upcoming-event window", () => {
    const events = [calendarEvent({ id: "e1", type: "custom", date: "2026-01-25" })];
    expect(buildCalendarNotifications(events, TODAY)).toEqual([]);
  });

  it("ignores a past event", () => {
    const events = [calendarEvent({ id: "e1", type: "custom", date: "2026-01-10" })];
    expect(buildCalendarNotifications(events, TODAY)).toEqual([]);
  });

  it("excludes interview-type events (already their own category)", () => {
    const events = [calendarEvent({ id: "e1", type: "interview", date: "2026-01-15" })];
    expect(buildCalendarNotifications(events, TODAY)).toEqual([]);
  });

  it("excludes application_submitted and goal_deadline events (their own categories)", () => {
    const events = [
      calendarEvent({ id: "e1", type: "application_submitted", date: "2026-01-15" }),
      calendarEvent({ id: "e2", type: "goal_deadline", date: "2026-01-15" }),
    ];
    expect(buildCalendarNotifications(events, TODAY)).toEqual([]);
  });
});

describe("buildGoalNotifications", () => {
  it("fires 'weekly_goal_completed' for a completed active weekly goal", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "weekly" }),
        progress: progress({ current: 5, target: 5, isCompleted: true }),
      },
    ];
    const notifications = buildGoalNotifications(goals, TODAY);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("weekly_goal_completed");
  });

  it("does not fire anything for a completed non-weekly goal (already achieved, nothing to nudge)", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "monthly" }),
        progress: progress({ current: 5, target: 5, isCompleted: true }),
      },
    ];
    expect(buildGoalNotifications(goals, TODAY)).toEqual([]);
  });

  it("fires 'goal_behind_schedule' when the estimated completion date is after the period end", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "monthly" }),
        progress: progress({
          current: 1,
          target: 10,
          isCompleted: false,
          periodEnd: "2026-01-31",
          estimatedCompletionDate: "2026-02-15",
        }),
      },
    ];
    const notifications = buildGoalNotifications(goals, TODAY);
    expect(notifications[0].type).toBe("goal_behind_schedule");
  });

  it("fires 'goal_deadline_approaching' when the period ends within the approaching window", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "weekly" }),
        progress: progress({
          current: 2,
          target: 10,
          isCompleted: false,
          periodEnd: "2026-01-16", // 1 day away
          estimatedCompletionDate: null,
        }),
      },
    ];
    const notifications = buildGoalNotifications(goals, TODAY);
    expect(notifications[0].type).toBe("goal_deadline_approaching");
  });

  it("fires 'goal_close_to_target' at/above the close-to-target ratio, when no other tier applies", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "monthly" }),
        progress: progress({
          current: 8,
          target: 10,
          percentage: 80,
          remaining: 2,
          isCompleted: false,
          periodEnd: "2026-02-28",
          estimatedCompletionDate: null,
        }),
      },
    ];
    const notifications = buildGoalNotifications(goals, TODAY);
    expect(notifications[0].type).toBe("goal_close_to_target");
  });

  it("fires nothing for an on-track goal with no urgency", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "monthly" }),
        progress: progress({
          current: 1,
          target: 10,
          isCompleted: false,
          periodEnd: "2026-02-28",
          estimatedCompletionDate: "2026-01-20",
        }),
      },
    ];
    expect(buildGoalNotifications(goals, TODAY)).toEqual([]);
  });

  it("ignores paused/archived goals entirely", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "weekly", status: "paused" }),
        progress: progress({ current: 5, target: 5, isCompleted: true }),
      },
    ];
    expect(buildGoalNotifications(goals, TODAY)).toEqual([]);
  });
});

describe("buildAchievementNotifications", () => {
  it("creates one notification per unlocked achievement, keyed only by its achievement key", () => {
    const achievements: AchievementState[] = [
      {
        definition: { key: "first_application", label: "First Application", description: "Submit your first application." },
        unlocked: true,
        unlockedAt: "2026-01-10T00:00:00.000Z",
      },
      {
        definition: { key: "applications_10", label: "10 Applications", description: "Submit 10 applications." },
        unlocked: false,
        unlockedAt: null,
      },
    ];

    const notifications = buildAchievementNotifications(achievements);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].key).toBe("achievement:unlocked:first_application");
    expect(notifications[0].timestamp).toBe("2026-01-10T00:00:00.000Z");
  });
});

describe("buildGeneralNotifications", () => {
  it("shows the welcome notification within the welcome window", () => {
    const notifications = buildGeneralNotifications("2026-01-10T00:00:00.000Z", true, TODAY);
    expect(notifications.some((n) => n.type === "welcome")).toBe(true);
  });

  it("does not show the welcome notification once outside the welcome window", () => {
    const notifications = buildGeneralNotifications("2025-01-01T00:00:00.000Z", true, TODAY);
    expect(notifications.some((n) => n.type === "welcome")).toBe(false);
  });

  it("shows the 'set a goal' tip only when the user has no goals", () => {
    const withGoals = buildGeneralNotifications("2025-01-01T00:00:00.000Z", true, TODAY);
    const withoutGoals = buildGeneralNotifications("2025-01-01T00:00:00.000Z", false, TODAY);
    expect(withGoals.some((n) => n.type === "tip")).toBe(false);
    expect(withoutGoals.some((n) => n.type === "tip")).toBe(true);
  });
});

describe("buildNotifications", () => {
  it("merges every category and sorts by timestamp descending", () => {
    const notifications = buildNotifications({
      events: [
        calendarEvent({ id: "e1", type: "custom", date: "2026-01-15", title: "Networking coffee" }),
      ],
      history: [],
      goalsWithProgress: [],
      achievements: [],
      userCreatedAt: "2020-01-01T00:00:00.000Z",
      today: TODAY,
    });

    expect(notifications.length).toBeGreaterThan(0);
    const timestamps = notifications.map((n) => n.timestamp);
    expect([...timestamps].sort().reverse()).toEqual(timestamps);
  });
});

describe("mergeNotificationState", () => {
  it("attaches a persisted status, defaulting to unread when no state row exists", () => {
    const notifications: Notification[] = [
      { key: "a", category: "general", type: "welcome", title: "t", description: "d", timestamp: "2026-01-01T00:00:00.000Z", status: "unread" },
      { key: "b", category: "general", type: "tip", title: "t2", description: "d2", timestamp: "2026-01-01T00:00:00.000Z", status: "unread" },
    ];
    const merged = mergeNotificationState(notifications, [
      { notification_key: "a", status: "read" },
    ]);

    expect(merged.find((n) => n.key === "a")?.status).toBe("read");
    expect(merged.find((n) => n.key === "b")?.status).toBe("unread");
  });
});

describe("filterNotifications", () => {
  const notifications: Notification[] = [
    {
      key: "a",
      category: "application",
      type: "no_activity",
      title: "No activity",
      description: "Acme stale",
      timestamp: "2026-01-10T00:00:00.000Z",
      status: "unread",
      companyId: "c1",
      companyName: "Acme",
      applicationId: "app-1",
    },
    {
      key: "b",
      category: "goal",
      type: "goal_close_to_target",
      title: "Almost there",
      description: "Weekly goal",
      timestamp: "2026-01-12T00:00:00.000Z",
      status: "read",
    },
  ];

  it("filters by unreadOnly", () => {
    expect(filterNotifications(notifications, { unreadOnly: true }).map((n) => n.key)).toEqual(["a"]);
  });

  it("filters by category", () => {
    expect(filterNotifications(notifications, { category: "goal" }).map((n) => n.key)).toEqual(["b"]);
  });

  it("filters by companyId and applicationId", () => {
    expect(filterNotifications(notifications, { companyId: "c1" }).map((n) => n.key)).toEqual(["a"]);
    expect(filterNotifications(notifications, { applicationId: "app-1" }).map((n) => n.key)).toEqual(["a"]);
  });

  it("filters by date range", () => {
    expect(
      filterNotifications(notifications, { dateFrom: "2026-01-11", dateTo: "2026-01-31" }).map((n) => n.key)
    ).toEqual(["b"]);
  });

  it("filters by a case-insensitive text query across title/description/company", () => {
    expect(filterNotifications(notifications, { query: "acme" }).map((n) => n.key)).toEqual(["a"]);
    expect(filterNotifications(notifications, { query: "almost" }).map((n) => n.key)).toEqual(["b"]);
  });

  it("returns everything when no filters are given", () => {
    expect(filterNotifications(notifications, {})).toHaveLength(2);
  });
});

describe("groupNotificationsByRecency", () => {
  function notification(key: string, timestamp: string, status: Notification["status"] = "unread"): Notification {
    return { key, category: "general", type: "tip", title: key, description: key, timestamp, status };
  }

  it("groups into today/yesterday/this_week/older correctly, omitting empty groups", () => {
    const notifications = [
      notification("today", "2026-01-15T00:00:00.000Z"),
      notification("yesterday", "2026-01-14T00:00:00.000Z"),
      notification("this-week-past", "2026-01-11T00:00:00.000Z"),
      notification("this-week-future", "2026-01-17T00:00:00.000Z"),
      notification("older", "2025-12-01T00:00:00.000Z"),
    ];

    const groups = groupNotificationsByRecency(notifications, TODAY);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.notifications.map((n) => n.key)]));

    expect(byKey.today).toEqual(["today"]);
    expect(byKey.yesterday).toEqual(["yesterday"]);
    expect(byKey.this_week).toEqual(["this-week-past", "this-week-future"]);
    expect(byKey.older).toEqual(["older"]);
  });

  it("excludes archived notifications from every group", () => {
    const notifications = [notification("archived", "2026-01-15T00:00:00.000Z", "archived")];
    expect(groupNotificationsByRecency(notifications, TODAY)).toEqual([]);
  });

  it("omits a group entirely when it has no notifications", () => {
    const notifications = [notification("today", "2026-01-15T00:00:00.000Z")];
    const groups = groupNotificationsByRecency(notifications, TODAY);
    expect(groups.map((g) => g.key)).toEqual(["today"]);
  });
});

describe("computeUnreadCount", () => {
  it("counts only unread notifications", () => {
    const notifications: Notification[] = [
      { key: "a", category: "general", type: "tip", title: "a", description: "a", timestamp: "2026-01-01T00:00:00.000Z", status: "unread" },
      { key: "b", category: "general", type: "tip", title: "b", description: "b", timestamp: "2026-01-01T00:00:00.000Z", status: "read" },
      { key: "c", category: "general", type: "tip", title: "c", description: "c", timestamp: "2026-01-01T00:00:00.000Z", status: "archived" },
    ];
    expect(computeUnreadCount(notifications)).toBe(1);
  });
});
