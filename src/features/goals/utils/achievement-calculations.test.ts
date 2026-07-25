import { describe, expect, it } from "vitest";

import type { ApplicationHistoryFacts } from "@/features/analytics/utils/analytics-calculations";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";
import {
  CONSISTENT_WEEK_APPLICATION_THRESHOLD,
  INTERVIEW_MASTER_THRESHOLD,
  LONG_STREAK_DAYS_THRESHOLD,
  OFFER_HUNTER_THRESHOLD,
} from "@/features/goals/constants/goal.constants";
import type { StreakSummary } from "@/features/goals/types/goal.types";
import { evaluateAchievements } from "@/features/goals/utils/achievement-calculations";

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

function noStreaks(): StreakSummary {
  return {
    currentDayStreak: 0,
    longestDayStreak: 0,
    currentWeekStreak: 0,
    longestWeekStreak: 0,
    currentMonthStreak: 0,
    longestMonthStreak: 0,
  };
}

function submittedApps(count: number): AnalyticsApplicationRow[] {
  return Array.from({ length: count }, (_, index) =>
    app({ id: `app-${index}`, application_date: `2026-01-${String((index % 27) + 1).padStart(2, "0")}` })
  );
}

describe("evaluateAchievements", () => {
  it("returns nothing for a user with no applications and no streak history", () => {
    expect(
      evaluateAchievements({ apps: [], historyFacts: new Map(), streaks: noStreaks() })
    ).toEqual([]);
  });

  it("unlocks 'first_application' once at least one application is submitted", () => {
    const apps = [app({ id: "a1", application_date: "2026-01-01" })];
    const earned = evaluateAchievements({ apps, historyFacts: new Map(), streaks: noStreaks() });
    expect(earned).toContain("first_application");
  });

  it("does not count a Wishlist (not-yet-submitted) application toward 'first_application'", () => {
    const apps = [app({ id: "a1", application_date: null })];
    const earned = evaluateAchievements({ apps, historyFacts: new Map(), streaks: noStreaks() });
    expect(earned).not.toContain("first_application");
  });

  it("unlocks the 10/50/100 application milestones only once that many are submitted", () => {
    const earned10 = evaluateAchievements({
      apps: submittedApps(10),
      historyFacts: new Map(),
      streaks: noStreaks(),
    });
    expect(earned10).toContain("applications_10");
    expect(earned10).not.toContain("applications_50");
    expect(earned10).not.toContain("applications_100");

    const earned9 = evaluateAchievements({
      apps: submittedApps(9),
      historyFacts: new Map(),
      streaks: noStreaks(),
    });
    expect(earned9).not.toContain("applications_10");
  });

  it("unlocks 'first_interview'/'first_offer'/'first_accepted_offer' from ApplicationHistoryFacts, not current_status", () => {
    const apps = [app({ id: "a1", current_status: "Rejected" })];
    const historyFacts = new Map([
      [
        "a1",
        facts({
          firstInterviewEnteredAt: "2026-01-05T00:00:00.000Z",
          offerEnteredAt: "2026-01-10T00:00:00.000Z",
          acceptedEnteredAt: "2026-01-15T00:00:00.000Z",
        }),
      ],
    ]);

    const earned = evaluateAchievements({ apps, historyFacts, streaks: noStreaks() });

    expect(earned).toContain("first_interview");
    expect(earned).toContain("first_offer");
    expect(earned).toContain("first_accepted_offer");
  });

  it(`unlocks 'interview_master' once ${INTERVIEW_MASTER_THRESHOLD} applications reached an interview stage`, () => {
    const apps = Array.from({ length: INTERVIEW_MASTER_THRESHOLD }, (_, i) => app({ id: `a${i}` }));
    const historyFacts = new Map(
      apps.map((a) => [a.id, facts({ firstInterviewEnteredAt: "2026-01-05T00:00:00.000Z" })])
    );

    expect(
      evaluateAchievements({ apps, historyFacts, streaks: noStreaks() })
    ).toContain("interview_master");
  });

  it(`does not unlock 'interview_master' below ${INTERVIEW_MASTER_THRESHOLD} interviews`, () => {
    const apps = Array.from({ length: INTERVIEW_MASTER_THRESHOLD - 1 }, (_, i) => app({ id: `a${i}` }));
    const historyFacts = new Map(
      apps.map((a) => [a.id, facts({ firstInterviewEnteredAt: "2026-01-05T00:00:00.000Z" })])
    );

    expect(
      evaluateAchievements({ apps, historyFacts, streaks: noStreaks() })
    ).not.toContain("interview_master");
  });

  it(`unlocks 'offer_hunter' once ${OFFER_HUNTER_THRESHOLD} offers were received`, () => {
    const apps = Array.from({ length: OFFER_HUNTER_THRESHOLD }, (_, i) => app({ id: `a${i}` }));
    const historyFacts = new Map(
      apps.map((a) => [a.id, facts({ offerEnteredAt: "2026-01-05T00:00:00.000Z" })])
    );

    expect(
      evaluateAchievements({ apps, historyFacts, streaks: noStreaks() })
    ).toContain("offer_hunter");
  });

  it(`unlocks 'consistent_week' once ${CONSISTENT_WEEK_APPLICATION_THRESHOLD} applications land in a single Monday-start week`, () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-05" }),
      app({ id: "a2", application_date: "2026-01-06" }),
      app({ id: "a3", application_date: "2026-01-07" }),
      app({ id: "a4", application_date: "2026-01-08" }),
      app({ id: "a5", application_date: "2026-01-09" }),
    ];

    expect(
      evaluateAchievements({ apps, historyFacts: new Map(), streaks: noStreaks() })
    ).toContain("consistent_week");
  });

  it("does not unlock 'consistent_week' when the same total count is spread across different weeks", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-02" }), // week of Dec 29
      app({ id: "a2", application_date: "2026-01-05" }), // week of Jan 5
      app({ id: "a3", application_date: "2026-01-12" }), // week of Jan 12
    ];

    expect(
      evaluateAchievements({ apps, historyFacts: new Map(), streaks: noStreaks() })
    ).not.toContain("consistent_week");
  });

  it(`unlocks 'streak_30_days' from the reused longestDayStreak, without recomputing it`, () => {
    const earned = evaluateAchievements({
      apps: [],
      historyFacts: new Map(),
      streaks: { ...noStreaks(), longestDayStreak: LONG_STREAK_DAYS_THRESHOLD },
    });
    expect(earned).toContain("streak_30_days");
  });

  it("does not unlock 'streak_30_days' below the threshold", () => {
    const earned = evaluateAchievements({
      apps: [],
      historyFacts: new Map(),
      streaks: { ...noStreaks(), longestDayStreak: LONG_STREAK_DAYS_THRESHOLD - 1 },
    });
    expect(earned).not.toContain("streak_30_days");
  });
});
