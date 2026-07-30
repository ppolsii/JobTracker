import { describe, expect, it, vi } from "vitest";

import { CalendarService } from "@/features/calendar/services/calendar.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { GoalService } from "@/features/goals/services/goal.service";
import { NotificationRepository } from "@/features/notifications/repositories/notification.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/billing/services/billing.service", () => ({
  BillingService: { requireProPlan: vi.fn() },
}));

vi.mock("@/features/calendar/services/calendar.service", () => ({
  CalendarService: { getEvents: vi.fn() },
}));

vi.mock("@/features/goals/services/goal.service", () => ({
  GoalService: { getGoalsPageData: vi.fn() },
}));

vi.mock("@/features/notifications/repositories/notification.repository", () => ({
  NotificationRepository: {
    listStatesForUser: vi.fn(),
    upsertStatus: vi.fn(),
    upsertManyStatus: vi.fn(),
    softDelete: vi.fn(),
    softDeleteMany: vi.fn(),
  },
}));

const mockedBilling = vi.mocked(BillingService);
const mockedCalendar = vi.mocked(CalendarService);
const mockedGoals = vi.mocked(GoalService);
const mockedRepository = vi.mocked(NotificationRepository);

const TODAY = new Date(Date.UTC(2026, 0, 15));
const USER_CREATED_AT = "2020-01-01T00:00:00.000Z"; // outside the welcome window

function allowPro() {
  mockedBilling.requireProPlan.mockResolvedValue({ success: true, data: true });
}

function emptyDependencies() {
  mockedCalendar.getEvents.mockResolvedValue({
    success: true,
    data: { events: [], history: [], notes: [], feedback: [] },
  });
  mockedGoals.getGoalsPageData.mockResolvedValue({
    success: true,
    data: {
      // Not empty on purpose: an empty goals list would make
      // buildGeneralNotifications' "set a goal" tip fire, which would make
      // these "nothing to notify about" fixtures misleading. One archived
      // goal keeps goalsWithProgress non-empty (so the tip stays silent)
      // while still producing zero goal notifications of its own
      // (buildGoalNotifications skips non-active goals).
      goalsWithProgress: [
        {
          goal: {
            id: "g-inactive",
            user_id: "user-1",
            metric: "applications",
            period: "weekly",
            target_value: 5,
            title: null,
            status: "archived",
            completed_at: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            deleted_at: null,
          },
          progress: {
            current: 0,
            target: 5,
            remaining: 5,
            percentage: 0,
            estimatedCompletionDate: null,
            periodStart: "2026-01-05",
            periodEnd: "2026-01-11",
            isCompleted: false,
          },
        },
      ],
      streaks: {
        currentDayStreak: 0,
        longestDayStreak: 0,
        currentWeekStreak: 0,
        longestWeekStreak: 0,
        currentMonthStreak: 0,
        longestMonthStreak: 0,
      },
      statistics: {
        completedGoals: 0,
        activeGoals: 0,
        completionRate: null,
        averageCompletionDays: null,
        longestStreak: 0,
        currentStreak: 0,
      },
      achievements: [],
    },
  });
  mockedRepository.listStatesForUser.mockResolvedValue({ data: [], error: null } as never);
}

describe("NotificationService.getNotifications", () => {
  it("denies a Free plan user before fetching anything ('reuse the existing BillingService')", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await NotificationService.getNotifications("user-1", USER_CREATED_AT, {}, TODAY);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
    expect(mockedCalendar.getEvents).not.toHaveBeenCalled();
  });

  it("reuses CalendarService.getEvents and GoalService.getGoalsPageData wholesale, with no independent Application/Status History fetch", async () => {
    allowPro();
    emptyDependencies();

    const result = await NotificationService.getNotifications("user-1", USER_CREATED_AT, {}, TODAY);

    expect(result.success).toBe(true);
    expect(mockedCalendar.getEvents).toHaveBeenCalledWith("user-1", {});
    expect(mockedGoals.getGoalsPageData).toHaveBeenCalledWith("user-1", TODAY);
  });

  it("propagates an error when the Calendar read fails", async () => {
    allowPro();
    mockedCalendar.getEvents.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await NotificationService.getNotifications("user-1", USER_CREATED_AT, {}, TODAY);
    expect(result.success).toBe(false);
  });

  it("propagates an error when the Goals read fails", async () => {
    allowPro();
    mockedCalendar.getEvents.mockResolvedValue({
      success: true,
      data: { events: [], history: [], notes: [], feedback: [] },
    });
    mockedGoals.getGoalsPageData.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await NotificationService.getNotifications("user-1", USER_CREATED_AT, {}, TODAY);
    expect(result.success).toBe(false);
  });

  it("merges persisted state so a read notification does not count toward unreadCount", async () => {
    allowPro();
    mockedCalendar.getEvents.mockResolvedValue({
      success: true,
      data: {
        events: [
          {
            id: "e1",
            type: "custom",
            title: "Networking coffee",
            date: "2026-01-15",
            applicationId: null,
            applicationStatusHistoryId: null,
            companyId: null,
            companyName: null,
            position: null,
            description: null,
            workMode: null,
            employmentType: null,
            applicationStatus: null,
            isCustom: true,
          },
        ],
        history: [],
        notes: [],
        feedback: [],
      },
    });
    mockedGoals.getGoalsPageData.mockResolvedValue({
      success: true,
      data: {
        goalsWithProgress: [],
        streaks: {
          currentDayStreak: 0,
          longestDayStreak: 0,
          currentWeekStreak: 0,
          longestWeekStreak: 0,
          currentMonthStreak: 0,
          longestMonthStreak: 0,
        },
        statistics: {
          completedGoals: 0,
          activeGoals: 0,
          completionRate: null,
          averageCompletionDays: null,
          longestStreak: 0,
          currentStreak: 0,
        },
        achievements: [],
      },
    });
    mockedRepository.listStatesForUser.mockResolvedValue({
      data: [
        { id: "s1", user_id: "user-1", notification_key: "calendar:todays_event:e1", status: "read", created_at: "", updated_at: "", deleted_at: null },
        // goalsWithProgress is empty above, so buildGeneralNotifications'
        // "set a goal" tip also fires - marked read here too, so this test
        // isolates exactly what it means to check: state merging correctly
        // zeroes out unreadCount, not goal-tip behaviour (covered
        // separately in notification-calculations.test.ts).
        { id: "s2", user_id: "user-1", notification_key: "general:tip_set_a_goal", status: "read", created_at: "", updated_at: "", deleted_at: null },
      ],
      error: null,
    } as never);

    const result = await NotificationService.getNotifications("user-1", USER_CREATED_AT, {}, TODAY);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unreadCount).toBe(0);
    }
  });

  // Regression test: deleting a notification whose underlying condition is
  // still true (here, "no goals yet" - buildGeneralNotifications keeps
  // regenerating "general:tip_set_a_goal" every load while goalsWithProgress
  // stays empty) used to reappear immediately, because
  // listStatesForUser filtered out `deleted_at`-set rows entirely, so the
  // regenerated notification had no matching state row to merge and
  // defaulted back to "unread." The state row must now stay queryable and
  // still be recognized as deleted on every subsequent read.
  it("keeps a deleted notification out of the grouped result even when its trigger condition still fires on every read", async () => {
    allowPro();
    emptyDependencies();
    mockedRepository.listStatesForUser.mockResolvedValue({
      data: [
        {
          id: "s1",
          user_id: "user-1",
          notification_key: "general:tip_set_a_goal",
          status: "unread",
          created_at: "",
          updated_at: "",
          deleted_at: "2026-01-10T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const result = await NotificationService.getNotifications("user-1", USER_CREATED_AT, {}, TODAY);

    expect(result.success).toBe(true);
    if (result.success) {
      const keys = result.data.groups.flatMap((group) =>
        group.notifications.map((n) => n.key)
      );
      expect(keys).not.toContain("general:tip_set_a_goal");
    }
  });
});

describe("NotificationService.getUnreadCount", () => {
  it("denies a Free plan user", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await NotificationService.getUnreadCount("user-1", USER_CREATED_AT, TODAY);
    expect(result.success).toBe(false);
  });

  it("returns 0 when there is nothing to notify about", async () => {
    allowPro();
    emptyDependencies();

    const result = await NotificationService.getUnreadCount("user-1", USER_CREATED_AT, TODAY);
    expect(result).toEqual({ success: true, data: 0 });
  });
});

describe("NotificationService.markAsRead", () => {
  it("denies a Free plan user before writing anything", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await NotificationService.markAsRead("user-1", "general:welcome");
    expect(result.success).toBe(false);
    expect(mockedRepository.upsertStatus).not.toHaveBeenCalled();
  });

  it("upserts the read status for the given key", async () => {
    allowPro();
    mockedRepository.upsertStatus.mockResolvedValue({ data: { id: "1" }, error: null } as never);

    await NotificationService.markAsRead("user-1", "general:welcome");

    expect(mockedRepository.upsertStatus).toHaveBeenCalledWith("user-1", "general:welcome", "read");
  });
});

describe("NotificationService.markAllAsRead", () => {
  it("gathers every currently-unread key and marks them all read in one bulk upsert", async () => {
    allowPro();
    mockedCalendar.getEvents.mockResolvedValue({
      success: true,
      data: {
        events: [
          {
            id: "e1",
            type: "custom",
            title: "Coffee chat",
            date: "2026-01-15",
            applicationId: null,
            applicationStatusHistoryId: null,
            companyId: null,
            companyName: null,
            position: null,
            description: null,
            workMode: null,
            employmentType: null,
            applicationStatus: null,
            isCustom: true,
          },
        ],
        history: [],
        notes: [],
        feedback: [],
      },
    });
    mockedGoals.getGoalsPageData.mockResolvedValue({
      success: true,
      data: {
        goalsWithProgress: [],
        streaks: {
          currentDayStreak: 0,
          longestDayStreak: 0,
          currentWeekStreak: 0,
          longestWeekStreak: 0,
          currentMonthStreak: 0,
          longestMonthStreak: 0,
        },
        statistics: {
          completedGoals: 0,
          activeGoals: 0,
          completionRate: null,
          averageCompletionDays: null,
          longestStreak: 0,
          currentStreak: 0,
        },
        achievements: [],
      },
    });
    mockedRepository.listStatesForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedRepository.upsertManyStatus.mockResolvedValue({ data: [], error: null } as never);

    const result = await NotificationService.markAllAsRead("user-1", USER_CREATED_AT, TODAY);

    expect(result.success).toBe(true);
    // goalsWithProgress is empty above, so buildGeneralNotifications' "set a
    // goal" tip is also currently unread and gets swept up too - that's
    // correct "mark ALL as read" behaviour, not an artifact of this fixture.
    expect(mockedRepository.upsertManyStatus).toHaveBeenCalledWith(
      "user-1",
      ["calendar:todays_event:e1", "general:tip_set_a_goal"],
      "read"
    );
  });
});

describe("NotificationService.archiveNotification", () => {
  it("upserts the archived status", async () => {
    allowPro();
    mockedRepository.upsertStatus.mockResolvedValue({ data: { id: "1" }, error: null } as never);

    await NotificationService.archiveNotification("user-1", "general:welcome");

    expect(mockedRepository.upsertStatus).toHaveBeenCalledWith("user-1", "general:welcome", "archived");
  });
});

describe("NotificationService.deleteNotification", () => {
  it("soft-deletes the given key", async () => {
    allowPro();
    mockedRepository.softDelete.mockResolvedValue({ data: { id: "1" }, error: null } as never);

    await NotificationService.deleteNotification("user-1", "general:welcome");

    expect(mockedRepository.softDelete).toHaveBeenCalledWith("user-1", "general:welcome");
  });
});

describe("NotificationService.deleteAllRead", () => {
  it("soft-deletes only currently-read notification keys, leaving unread ones alone", async () => {
    allowPro();
    mockedCalendar.getEvents.mockResolvedValue({
      success: true,
      data: {
        events: [
          {
            id: "e-read",
            type: "custom",
            title: "Read one",
            date: "2026-01-15",
            applicationId: null,
            applicationStatusHistoryId: null,
            companyId: null,
            companyName: null,
            position: null,
            description: null,
            workMode: null,
            employmentType: null,
            applicationStatus: null,
            isCustom: true,
          },
          {
            id: "e-unread",
            type: "reminder",
            title: "Unread one",
            date: "2026-01-15",
            applicationId: null,
            applicationStatusHistoryId: null,
            companyId: null,
            companyName: null,
            position: null,
            description: null,
            workMode: null,
            employmentType: null,
            applicationStatus: null,
            isCustom: true,
          },
        ],
        history: [],
        notes: [],
        feedback: [],
      },
    });
    mockedGoals.getGoalsPageData.mockResolvedValue({
      success: true,
      data: {
        goalsWithProgress: [],
        streaks: {
          currentDayStreak: 0,
          longestDayStreak: 0,
          currentWeekStreak: 0,
          longestWeekStreak: 0,
          currentMonthStreak: 0,
          longestMonthStreak: 0,
        },
        statistics: {
          completedGoals: 0,
          activeGoals: 0,
          completionRate: null,
          averageCompletionDays: null,
          longestStreak: 0,
          currentStreak: 0,
        },
        achievements: [],
      },
    });
    mockedRepository.listStatesForUser.mockResolvedValue({
      data: [
        { id: "s1", user_id: "user-1", notification_key: "calendar:todays_event:e-read", status: "read", created_at: "", updated_at: "", deleted_at: null },
      ],
      error: null,
    } as never);
    mockedRepository.softDeleteMany.mockResolvedValue({ data: [], error: null } as never);

    const result = await NotificationService.deleteAllRead("user-1", USER_CREATED_AT, TODAY);

    expect(result.success).toBe(true);
    expect(mockedRepository.softDeleteMany).toHaveBeenCalledWith("user-1", [
      "calendar:todays_event:e-read",
    ]);
  });
});
