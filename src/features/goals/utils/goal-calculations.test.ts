import { describe, expect, it } from "vitest";

import type { ApplicationHistoryFacts } from "@/features/analytics/utils/analytics-calculations";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";
import type { GoalRecord, GoalWithProgress } from "@/features/goals/types/goal.types";
import {
  buildDashboardGoalsWidgetData,
  buildGoalDeadlineEvents,
  buildStreakSummary,
  computeEstimatedCompletionDate,
  computeGoalProgress,
  computeGoalStatistics,
  computeMonthlyStreak,
  computeWeeklyStreak,
  countMetricInWindow,
  getGoalDisplayTitle,
  getPeriodWindow,
} from "@/features/goals/utils/goal-calculations";

function app(overrides: Partial<AnalyticsApplicationRow> & { id: string }): AnalyticsApplicationRow {
  return {
    company_id: "company-1",
    cv_version_id: "cv-1",
    position: "Backend Engineer",
    source: null,
    work_mode: null,
    employment_type: null,
    application_date: "2026-01-01",
    current_status: "Applied",
    companies: { name: "Acme" },
    cv_versions: { name: "Backend CV" },
    salary_min: null,
    salary_max: null,
    currency: null,
    ...overrides,
  };
}

function facts(overrides: Partial<ApplicationHistoryFacts> = {}): ApplicationHistoryFacts {
  return {
    respondedAt: null,
    offerEnteredAt: null,
    acceptedEnteredAt: null,
    recruiterContactEnteredAt: null,
    firstInterviewEnteredAt: null,
    enteredStatuses: new Set(),
    rejectedFromStage: null,
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

describe("getPeriodWindow", () => {
  // 2026-01-07 is a Wednesday.
  const today = new Date(Date.UTC(2026, 0, 7));

  it("returns the Monday-Sunday window for 'weekly'", () => {
    expect(getPeriodWindow("weekly", today)).toEqual({
      start: "2026-01-05",
      end: "2026-01-11",
    });
  });

  it("returns the full calendar month for 'monthly'", () => {
    expect(getPeriodWindow("monthly", today)).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
  });

  it("returns the full calendar quarter for 'quarterly'", () => {
    expect(getPeriodWindow("quarterly", today)).toEqual({
      start: "2026-01-01",
      end: "2026-03-31",
    });
  });

  it("returns the full calendar year for 'yearly'", () => {
    expect(getPeriodWindow("yearly", today)).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });

  it("returns an unbounded (end: null) window for 'total'", () => {
    const window = getPeriodWindow("total", today);
    expect(window.end).toBeNull();
  });
});

describe("countMetricInWindow", () => {
  const window = { start: "2026-01-01", end: "2026-01-31" };

  it("counts 'applications' by application_date", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-15" }),
      app({ id: "a2", application_date: "2026-02-01" }),
      app({ id: "a3", application_date: null }),
    ];
    expect(countMetricInWindow("applications", apps, new Map(), window)).toBe(1);
  });

  it("counts 'interviews' by firstInterviewEnteredAt", () => {
    const apps = [app({ id: "a1" }), app({ id: "a2" })];
    const historyFacts = new Map([
      ["a1", facts({ firstInterviewEnteredAt: "2026-01-10T00:00:00.000Z" })],
      ["a2", facts()],
    ]);
    expect(countMetricInWindow("interviews", apps, historyFacts, window)).toBe(1);
  });

  it("counts 'offers' by offerEnteredAt and 'recruiter_contacts' by recruiterContactEnteredAt", () => {
    const apps = [app({ id: "a1" })];
    const historyFacts = new Map([
      [
        "a1",
        facts({
          offerEnteredAt: "2026-01-20T00:00:00.000Z",
          recruiterContactEnteredAt: "2026-01-05T00:00:00.000Z",
        }),
      ],
    ]);
    expect(countMetricInWindow("offers", apps, historyFacts, window)).toBe(1);
    expect(countMetricInWindow("recruiter_contacts", apps, historyFacts, window)).toBe(1);
  });

  it("treats a null end as unbounded (counts everything from start onward)", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-06-01" }),
      app({ id: "a2", application_date: "2025-01-01" }),
    ];
    expect(
      countMetricInWindow("applications", apps, new Map(), { start: "2026-01-01", end: null })
    ).toBe(1);
  });
});

describe("computeEstimatedCompletionDate", () => {
  const today = new Date(Date.UTC(2026, 0, 11));

  it("returns null once the target is already reached", () => {
    expect(computeEstimatedCompletionDate(5, 5, "2026-01-05", today)).toBeNull();
  });

  it("returns null when there is no progress yet to extrapolate a rate from", () => {
    expect(computeEstimatedCompletionDate(0, 5, "2026-01-05", today)).toBeNull();
  });

  it("extrapolates a future date from the current pace", () => {
    // 2 done in 7 days (Jan 5 -> Jan 11 inclusive) = rate 2/7/day; 3 remaining
    // needs ceil(3 / (2/7)) = 11 more days from today (Jan 11) -> Jan 22.
    const result = computeEstimatedCompletionDate(2, 5, "2026-01-05", today);
    expect(result).toBe("2026-01-22");
  });
});

describe("computeGoalProgress", () => {
  const today = new Date(Date.UTC(2026, 0, 7)); // Wednesday, in the Jan 5-11 week

  it("computes current/target/remaining/percentage for a weekly applications goal", () => {
    const goalRecord = goal({ id: "g1", metric: "applications", period: "weekly", target_value: 4 });
    const apps = [
      app({ id: "a1", application_date: "2026-01-05" }),
      app({ id: "a2", application_date: "2026-01-06" }),
      app({ id: "a3", application_date: "2025-12-01" }), // outside the window
    ];

    const progress = computeGoalProgress(goalRecord, apps, new Map(), today);

    expect(progress.current).toBe(2);
    expect(progress.target).toBe(4);
    expect(progress.remaining).toBe(2);
    expect(progress.percentage).toBe(50);
    expect(progress.periodStart).toBe("2026-01-05");
    expect(progress.periodEnd).toBe("2026-01-11");
    expect(progress.isCompleted).toBe(false);
  });

  it("marks isCompleted true and remaining 0 once current reaches or exceeds target", () => {
    const goalRecord = goal({ id: "g1", target_value: 2 });
    const apps = [
      app({ id: "a1", application_date: "2026-01-05" }),
      app({ id: "a2", application_date: "2026-01-06" }),
      app({ id: "a3", application_date: "2026-01-07" }),
    ];

    const progress = computeGoalProgress(goalRecord, apps, new Map(), today);

    expect(progress.isCompleted).toBe(true);
    expect(progress.remaining).toBe(0);
    expect(progress.estimatedCompletionDate).toBeNull();
  });

  it("for a 'total' goal, uses the earliest matching application as the pace baseline, not the window start", () => {
    const goalRecord = goal({ id: "g1", metric: "applications", period: "total", target_value: 10 });
    const apps = [
      app({ id: "a1", application_date: "2026-01-01" }),
      app({ id: "a2", application_date: "2026-01-05" }),
    ];

    const progress = computeGoalProgress(goalRecord, apps, new Map(), today);

    expect(progress.current).toBe(2);
    expect(progress.periodEnd).toBeNull();
  });
});

describe("getGoalDisplayTitle", () => {
  it("uses the goal's own title when set", () => {
    expect(getGoalDisplayTitle(goal({ id: "g1", title: "My custom goal" }))).toBe(
      "My custom goal"
    );
  });

  it("falls back to '<Metric> - <Period>' when no title is set", () => {
    expect(
      getGoalDisplayTitle(goal({ id: "g1", metric: "interviews", period: "monthly", title: null }))
    ).toBe("Interviews - Monthly");
  });

  it("falls back when the title is only whitespace", () => {
    expect(getGoalDisplayTitle(goal({ id: "g1", title: "   " }))).toBe(
      "Applications - Weekly"
    );
  });
});

describe("computeWeeklyStreak", () => {
  it("counts consecutive Monday-start weeks with at least one application", () => {
    const today = new Date(Date.UTC(2026, 0, 21)); // week of Jan 19-25
    const apps = [
      app({ id: "a1", application_date: "2026-01-05" }), // week of Jan 5
      app({ id: "a2", application_date: "2026-01-12" }), // week of Jan 12
      app({ id: "a3", application_date: "2026-01-19" }), // week of Jan 19 (current)
    ];

    const streak = computeWeeklyStreak(apps, today);
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it("breaks the current streak if the most recent active week isn't this week or last week", () => {
    const today = new Date(Date.UTC(2026, 2, 1)); // far in the future
    const apps = [app({ id: "a1", application_date: "2026-01-05" })];

    const streak = computeWeeklyStreak(apps, today);
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(1);
  });

  it("returns zero for both when there are no applications", () => {
    expect(computeWeeklyStreak([], new Date(Date.UTC(2026, 0, 1)))).toEqual({
      current: 0,
      longest: 0,
    });
  });
});

describe("computeMonthlyStreak", () => {
  it("counts consecutive calendar months with at least one application", () => {
    const today = new Date(Date.UTC(2026, 2, 15)); // March
    const apps = [
      app({ id: "a1", application_date: "2026-01-10" }),
      app({ id: "a2", application_date: "2026-02-10" }),
      app({ id: "a3", application_date: "2026-03-05" }),
    ];

    const streak = computeMonthlyStreak(apps, today);
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it("handles a year rollover as consecutive (December -> January)", () => {
    const today = new Date(Date.UTC(2026, 0, 15));
    const apps = [
      app({ id: "a1", application_date: "2025-12-10" }),
      app({ id: "a2", application_date: "2026-01-05" }),
    ];

    const streak = computeMonthlyStreak(apps, today);
    expect(streak.current).toBe(2);
  });
});

describe("buildStreakSummary", () => {
  it("passes the reused daily streak through unchanged and merges in the new weekly/monthly streaks", () => {
    const today = new Date(Date.UTC(2026, 0, 7));
    const apps = [app({ id: "a1", application_date: "2026-01-05" })];

    const summary = buildStreakSummary(apps, { current: 9, longest: 12 }, today);

    expect(summary.currentDayStreak).toBe(9);
    expect(summary.longestDayStreak).toBe(12);
    expect(summary.currentWeekStreak).toBeGreaterThanOrEqual(0);
    expect(summary.currentMonthStreak).toBeGreaterThanOrEqual(0);
  });
});

describe("computeGoalStatistics", () => {
  it("counts active goals excluding archived ones", () => {
    const goals: GoalWithProgress[] = [
      { goal: goal({ id: "g1", status: "active" }), progress: emptyProgress() },
      { goal: goal({ id: "g2", status: "paused" }), progress: emptyProgress() },
      { goal: goal({ id: "g3", status: "archived" }), progress: emptyProgress() },
    ];

    const stats = computeGoalStatistics(goals, streakSummary());
    expect(stats.activeGoals).toBe(1);
  });

  it("computes completion rate and average completion time only over 'total'-period goals", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({
          id: "g1",
          period: "total",
          created_at: "2026-01-01T00:00:00.000Z",
          completed_at: "2026-01-11T00:00:00.000Z",
        }),
        progress: emptyProgress(),
      },
      {
        goal: goal({ id: "g2", period: "total", completed_at: null }),
        progress: emptyProgress(),
      },
      // A completed-looking weekly goal must not count toward these stats -
      // recurring goals have no single honest "completion time".
      {
        goal: goal({ id: "g3", period: "weekly" }),
        progress: { ...emptyProgress(), isCompleted: true },
      },
    ];

    const stats = computeGoalStatistics(goals, streakSummary());
    expect(stats.completedGoals).toBe(1);
    expect(stats.completionRate).toBe(50);
    expect(stats.averageCompletionDays).toBe(10);
  });

  it("returns null completion rate/average when there are no 'total' goals at all", () => {
    const goals: GoalWithProgress[] = [
      { goal: goal({ id: "g1", period: "weekly" }), progress: emptyProgress() },
    ];

    const stats = computeGoalStatistics(goals, streakSummary());
    expect(stats.completionRate).toBeNull();
    expect(stats.averageCompletionDays).toBeNull();
  });

  it("reads longest/current streak straight from the given StreakSummary, never recomputing", () => {
    const stats = computeGoalStatistics([], streakSummary({ longestDayStreak: 40, currentDayStreak: 5 }));
    expect(stats.longestStreak).toBe(40);
    expect(stats.currentStreak).toBe(5);
  });
});

describe("buildGoalDeadlineEvents", () => {
  it("creates one deadline event per active, non-'total' goal, at its period end", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "weekly", status: "active" }),
        progress: { ...emptyProgress(), periodEnd: "2026-01-11", isCompleted: false },
      },
    ];

    const events = buildGoalDeadlineEvents(goals);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("goal_deadline");
    expect(events[0].date).toBe("2026-01-11");
    expect(events[0].goalCompleted).toBe(false);
  });

  it("excludes 'total' goals (no natural deadline) and paused/archived goals", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "total", status: "active" }),
        progress: { ...emptyProgress(), periodEnd: null },
      },
      {
        goal: goal({ id: "g2", period: "weekly", status: "paused" }),
        progress: { ...emptyProgress(), periodEnd: "2026-01-11" },
      },
    ];

    expect(buildGoalDeadlineEvents(goals)).toEqual([]);
  });

  it("marks goalCompleted true when the goal's progress is already complete", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "monthly", status: "active" }),
        progress: { ...emptyProgress(), periodEnd: "2026-01-31", isCompleted: true },
      },
    ];

    expect(buildGoalDeadlineEvents(goals)[0].goalCompleted).toBe(true);
  });
});

describe("buildDashboardGoalsWidgetData", () => {
  const today = new Date(Date.UTC(2026, 0, 7));

  it("counts today's applications from the bulk apps list", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-07" }),
      app({ id: "a2", application_date: "2026-01-06" }),
    ];

    const widget = buildDashboardGoalsWidgetData(apps, [], [], new Map(), today);
    expect(widget.todaysApplicationCount).toBe(1);
  });

  it("includes only active weekly goals", () => {
    const goals: GoalWithProgress[] = [
      { goal: goal({ id: "g1", period: "weekly", status: "active" }), progress: emptyProgress() },
      { goal: goal({ id: "g2", period: "monthly", status: "active" }), progress: emptyProgress() },
      { goal: goal({ id: "g3", period: "weekly", status: "paused" }), progress: emptyProgress() },
    ];

    const widget = buildDashboardGoalsWidgetData([], goals, [], new Map(), today);
    expect(widget.weeklyGoals.map((item) => item.goal.id)).toEqual(["g1"]);
  });

  it("sorts recently unlocked achievements by unlock date, most recent first, capped at 5", () => {
    const achievements = [
      { key: "first_application", unlockedAt: "2026-01-01T00:00:00.000Z" },
      { key: "applications_10", unlockedAt: "2026-01-05T00:00:00.000Z" },
    ];
    const labels = new Map([
      ["first_application", "First Application"],
      ["applications_10", "10 Applications"],
    ]);

    const widget = buildDashboardGoalsWidgetData([], [], achievements, labels, today);
    expect(widget.recentlyUnlockedAchievements.map((a) => a.definition.key)).toEqual([
      "applications_10",
      "first_application",
    ]);
  });

  it("includes only future/current active non-total goal deadlines, soonest first", () => {
    const goals: GoalWithProgress[] = [
      {
        goal: goal({ id: "g1", period: "weekly", status: "active" }),
        progress: { ...emptyProgress(), periodEnd: "2026-01-31" },
      },
      {
        goal: goal({ id: "g2", period: "monthly", status: "active" }),
        progress: { ...emptyProgress(), periodEnd: "2026-01-11" },
      },
      {
        goal: goal({ id: "g3", period: "total", status: "active" }),
        progress: { ...emptyProgress(), periodEnd: null },
      },
    ];

    const widget = buildDashboardGoalsWidgetData([], goals, [], new Map(), today);
    expect(widget.upcomingDeadlines.map((item) => item.goal.id)).toEqual(["g2", "g1"]);
  });
});

function emptyProgress() {
  return {
    current: 0,
    target: 1,
    remaining: 1,
    percentage: 0,
    estimatedCompletionDate: null,
    periodStart: "2026-01-01",
    periodEnd: null as string | null,
    isCompleted: false,
  };
}

function streakSummary(overrides: Partial<ReturnType<typeof buildStreakSummary>> = {}) {
  return {
    currentDayStreak: 0,
    longestDayStreak: 0,
    currentWeekStreak: 0,
    longestWeekStreak: 0,
    currentMonthStreak: 0,
    longestMonthStreak: 0,
    ...overrides,
  };
}
