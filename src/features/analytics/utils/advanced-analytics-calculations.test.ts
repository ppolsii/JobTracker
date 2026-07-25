import { describe, expect, it } from "vitest";

import {
  computeActivityAnalysis,
  computeAdvancedInsights,
  computeSalaryAnalysis,
  computeSalaryByCompany,
  computeSalaryByWorkMode,
  computeSalaryDistribution,
  computeSalaryStatistics,
  computeTimelineAnalysis,
  filterApplicationsForAdvancedAnalytics,
  rankCompanies,
} from "@/features/analytics/utils/advanced-analytics-calculations";
import {
  buildHistoryFactsByApplication,
  computeGroupAnalytics,
  computeWorkModeAnalytics,
  type ApplicationHistoryFacts,
} from "@/features/analytics/utils/analytics-calculations";
import type {
  AnalyticsApplicationRow,
  ApplicationStatusHistoryEntry,
} from "@/features/applications/types/application.types";

function app(
  overrides: Partial<AnalyticsApplicationRow> & { id: string }
): AnalyticsApplicationRow {
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

function historyEntry(
  overrides: Partial<ApplicationStatusHistoryEntry> & {
    application_id: string;
    new_status: ApplicationStatusHistoryEntry["new_status"];
  }
): ApplicationStatusHistoryEntry {
  return {
    id: "history-entry",
    previous_status: null,
    changed_at: "2026-01-02T00:00:00.000Z",
    created_by: "user-1",
    ...overrides,
  };
}

const EMPTY_FACTS: Map<string, ApplicationHistoryFacts> = new Map();

describe("filterApplicationsForAdvancedAnalytics", () => {
  const apps = [
    app({
      id: "a1",
      company_id: "c1",
      cv_version_id: "cv1",
      work_mode: "Remote",
      employment_type: "Full Time",
      current_status: "Applied",
      application_date: "2026-01-05",
    }),
    app({
      id: "a2",
      company_id: "c2",
      cv_version_id: "cv2",
      work_mode: "Hybrid",
      employment_type: "Contract",
      current_status: "Offer",
      application_date: "2026-02-10",
    }),
  ];

  it("returns every application when no filter is set", () => {
    expect(filterApplicationsForAdvancedAnalytics(apps, {})).toHaveLength(2);
  });

  it("filters by date range", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      dateFrom: "2026-02-01",
    });
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("filters by company", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      companyId: "c1",
    });
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("filters by CV version", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      cvVersionId: "cv2",
    });
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("filters by work mode", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      workMode: "Hybrid",
    });
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("filters by employment type", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      employmentType: "Full Time",
    });
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("filters by status", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      status: "Offer",
    });
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("combines multiple filters (BUSINESS_RULES.md 'Filtering': combinable)", () => {
    const result = filterApplicationsForAdvancedAnalytics(apps, {
      workMode: "Remote",
      status: "Offer",
    });
    expect(result).toHaveLength(0);
  });

  it("excludes applications with no application_date when a date filter is set", () => {
    const noDate = [app({ id: "a3", application_date: null })];
    const result = filterApplicationsForAdvancedAnalytics(noDate, {
      dateFrom: "2026-01-01",
    });
    expect(result).toHaveLength(0);
  });
});

describe("rankCompanies", () => {
  it("excludes companies below the minimum comparison sample size", () => {
    const rows = computeGroupAnalytics(
      [app({ id: "a1", company_id: "c1", current_status: "HR Interview" })],
      EMPTY_FACTS,
      (a) => a.company_id,
      (a) => a.companies.name
    );

    const ranking = rankCompanies(rows);

    expect(ranking.top).toHaveLength(0);
    expect(ranking.worst).toHaveLength(0);
  });

  it("ranks qualifying companies by interview rate, top and worst", () => {
    const apps = [
      // c1: 3 apps, 2 interviews -> 66.7%
      app({ id: "a1", company_id: "c1", current_status: "HR Interview" }),
      app({ id: "a2", company_id: "c1", current_status: "Technical Interview" }),
      app({ id: "a3", company_id: "c1", current_status: "Applied" }),
      // c2: 3 apps, 0 interviews -> 0%
      app({ id: "a4", company_id: "c2", current_status: "Applied" }),
      app({ id: "a5", company_id: "c2", current_status: "Applied" }),
      app({ id: "a6", company_id: "c2", current_status: "Rejected" }),
    ];
    const rows = computeGroupAnalytics(
      apps,
      EMPTY_FACTS,
      (a) => a.company_id,
      (a) => a.companies.name
    );

    const ranking = rankCompanies(rows);

    expect(ranking.top[0].id).toBe("c1");
    expect(ranking.worst[0].id).toBe("c2");
  });

  it("computes the average response time across all qualifying rows", () => {
    const rows = [
      {
        id: "c1",
        name: "Acme",
        applications: 3,
        responses: 1,
        interviews: 1,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: 33,
        interviewRate: 33,
        offerRate: 0,
        averageResponseTimeDays: 4,
      },
      {
        id: "c2",
        name: "Globex",
        applications: 3,
        responses: 1,
        interviews: 0,
        offers: 0,
        accepted: 0,
        rejected: 1,
        responseRate: 33,
        interviewRate: 0,
        offerRate: 0,
        averageResponseTimeDays: 6,
      },
    ];

    const ranking = rankCompanies(rows);

    expect(ranking.averageResponseTimeDays).toBe(5);
  });

  it("returns null average response time when no row has one", () => {
    const rows = computeGroupAnalytics(
      [app({ id: "a1", company_id: "c1" })],
      EMPTY_FACTS,
      (a) => a.company_id,
      (a) => a.companies.name
    );

    expect(rankCompanies(rows).averageResponseTimeDays).toBeNull();
  });
});

describe("computeTimelineAnalysis", () => {
  it("computes average days for each consecutive stage transition", () => {
    const apps = [app({ id: "a1", application_date: "2026-01-01" })];
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a1",
        previous_status: "Applied",
        new_status: "Recruiter Contact",
        changed_at: "2026-01-03T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "a1",
        previous_status: "Recruiter Contact",
        new_status: "HR Interview",
        changed_at: "2026-01-06T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "a1",
        previous_status: "HR Interview",
        new_status: "Offer",
        changed_at: "2026-01-16T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "a1",
        previous_status: "Offer",
        new_status: "Accepted",
        changed_at: "2026-01-21T00:00:00.000Z",
      }),
    ]);

    const timeline = computeTimelineAnalysis(apps, historyFacts);

    expect(timeline.steps).toEqual([
      { from: "Application", to: "Recruiter Contact", averageDays: 2 },
      { from: "Recruiter Contact", to: "Interview", averageDays: 3 },
      { from: "Interview", to: "Offer", averageDays: 10 },
      { from: "Offer", to: "Accepted", averageDays: 5 },
    ]);
  });

  it("returns null steps and a zero-sample process when no application reached that far", () => {
    const apps = [app({ id: "a1", application_date: "2026-01-01" })];
    const timeline = computeTimelineAnalysis(apps, EMPTY_FACTS);

    expect(timeline.steps.every((step) => step.averageDays === null)).toBe(true);
    expect(timeline.process).toEqual({
      fastestDays: null,
      slowestDays: null,
      medianDays: null,
      sampleSize: 0,
    });
  });

  it("computes fastest/slowest/median process duration across accepted applications", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-01" }),
      app({ id: "a2", application_date: "2026-01-01" }),
      app({ id: "a3", application_date: "2026-01-01" }),
    ];
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a1",
        new_status: "Accepted",
        changed_at: "2026-01-11T00:00:00.000Z", // 10 days
      }),
      historyEntry({
        application_id: "a2",
        new_status: "Accepted",
        changed_at: "2026-01-21T00:00:00.000Z", // 20 days
      }),
      historyEntry({
        application_id: "a3",
        new_status: "Accepted",
        changed_at: "2026-01-31T00:00:00.000Z", // 30 days
      }),
    ]);

    const { process } = computeTimelineAnalysis(apps, historyFacts);

    expect(process).toEqual({
      fastestDays: 10,
      slowestDays: 30,
      medianDays: 20,
      sampleSize: 3,
    });
  });
});

describe("computeActivityAnalysis", () => {
  const TODAY = new Date("2026-01-10T12:00:00.000Z");

  it("counts the longest streak of consecutive days with an application", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-01" }),
      app({ id: "a2", application_date: "2026-01-02" }),
      app({ id: "a3", application_date: "2026-01-03" }),
      app({ id: "a4", application_date: "2026-01-06" }),
    ];

    const activity = computeActivityAnalysis(apps, [], TODAY);

    expect(activity.longestStreakDays).toBe(3);
  });

  it("reports a current streak only when the most recent day is today or yesterday", () => {
    const recent = [
      app({ id: "a1", application_date: "2026-01-08" }),
      app({ id: "a2", application_date: "2026-01-09" }),
    ];
    expect(computeActivityAnalysis(recent, [], TODAY).currentStreakDays).toBe(2);

    const stale = [app({ id: "a1", application_date: "2026-01-01" })];
    expect(computeActivityAnalysis(stale, [], TODAY).currentStreakDays).toBe(0);
  });

  it("finds the most and least active month from the given monthly analytics", () => {
    const monthlyAnalytics = [
      {
        id: "2026-01",
        name: "2026-01",
        applications: 10,
        responses: 0,
        interviews: 0,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: null,
        interviewRate: null,
        offerRate: null,
        averageResponseTimeDays: null,
      },
      {
        id: "2026-02",
        name: "2026-02",
        applications: 2,
        responses: 0,
        interviews: 0,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: null,
        interviewRate: null,
        offerRate: null,
        averageResponseTimeDays: null,
      },
    ];

    const activity = computeActivityAnalysis([], monthlyAnalytics, TODAY);

    expect(activity.mostActiveMonth).toEqual({ month: "2026-01", applications: 10 });
    expect(activity.leastActiveMonth).toEqual({ month: "2026-02", applications: 2 });
  });

  it("returns zero streaks and null months when there is no data at all", () => {
    const activity = computeActivityAnalysis([], [], TODAY);

    expect(activity.currentStreakDays).toBe(0);
    expect(activity.longestStreakDays).toBe(0);
    expect(activity.mostActiveMonth).toBeNull();
    expect(activity.leastActiveMonth).toBeNull();
    expect(activity.perWeek).toEqual([]);
  });
});

describe("salary calculations", () => {
  it("never breaks when no application has any salary data", () => {
    const apps = [app({ id: "a1" }), app({ id: "a2" })];

    expect(computeSalaryStatistics(apps)).toEqual({
      sampleSize: 0,
      min: null,
      max: null,
      average: null,
      median: null,
    });
    expect(computeSalaryDistribution(apps)).toEqual([]);
    expect(computeSalaryByCompany(apps)).toEqual([]);
    expect(computeSalaryByWorkMode(apps)).toEqual([]);
  });

  it("computes min/max/average/median from applications with salary data, ignoring those without", () => {
    const apps = [
      app({ id: "a1", salary_min: 40000, salary_max: 60000 }), // midpoint 50000
      app({ id: "a2", salary_min: 80000, salary_max: null }), // 80000
      app({ id: "a3", salary_min: null, salary_max: null }), // excluded
    ];

    const stats = computeSalaryStatistics(apps);

    expect(stats.sampleSize).toBe(2);
    expect(stats.min).toBe(50000);
    expect(stats.max).toBe(80000);
    expect(stats.average).toBe(65000);
    expect(stats.median).toBe(65000);
  });

  it("groups a single-value distribution into one bucket rather than dividing by zero", () => {
    const apps = [
      app({ id: "a1", salary_min: 50000, salary_max: 50000 }),
      app({ id: "a2", salary_min: 50000, salary_max: 50000 }),
    ];

    expect(computeSalaryDistribution(apps)).toEqual([
      { rangeLabel: "50000", count: 2 },
    ]);
  });

  it("computes average salary per company, sorted highest first", () => {
    const apps = [
      app({ id: "a1", company_id: "c1", salary_min: 40000, salary_max: 40000 }),
      app({ id: "a2", company_id: "c2", salary_min: 90000, salary_max: 90000 }),
    ];

    const byCompany = computeSalaryByCompany(apps);

    expect(byCompany[0].id).toBe("c2");
    expect(byCompany[0].averageSalary).toBe(90000);
  });

  it("computes average salary per work mode, excluding applications with no work mode recorded", () => {
    const apps = [
      app({ id: "a1", work_mode: "Remote", salary_min: 50000, salary_max: 50000 }),
      app({ id: "a2", work_mode: null, salary_min: 999999, salary_max: 999999 }),
    ];

    const byWorkMode = computeSalaryByWorkMode(apps);

    expect(byWorkMode).toHaveLength(1);
    expect(byWorkMode[0].id).toBe("Remote");
  });

  it("computeSalaryAnalysis composes all four pieces", () => {
    const apps = [app({ id: "a1", salary_min: 50000, salary_max: 50000 })];
    const analysis = computeSalaryAnalysis(apps);

    expect(analysis.statistics.sampleSize).toBe(1);
    expect(analysis.distribution).toHaveLength(1);
  });
});

describe("computeAdvancedInsights", () => {
  it("returns no insights when nothing qualifies", () => {
    expect(computeAdvancedInsights([], [])).toEqual([]);
  });

  it("never fabricates a work-mode insight below the minimum sample size", () => {
    const apps = [
      app({ id: "a1", work_mode: "Remote", current_status: "HR Interview" }),
    ];
    const workModeAnalytics = computeWorkModeAnalytics(apps);

    expect(computeAdvancedInsights(apps, workModeAnalytics)).toEqual([]);
  });

  it("compares work modes once both meet the minimum sample size", () => {
    const apps = [
      ...Array.from({ length: 5 }, (_, i) =>
        app({ id: `remote-${i}`, work_mode: "Remote", current_status: "HR Interview" })
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        app({ id: `onsite-${i}`, work_mode: "On Site", current_status: "Applied" })
      ),
    ];
    const workModeAnalytics = computeWorkModeAnalytics(apps);

    const insights = computeAdvancedInsights(apps, workModeAnalytics);

    expect(insights.some((insight) => insight.includes("Remote"))).toBe(true);
  });

  it("names the day of week with the highest interview rate once both compared days meet the minimum sample size", () => {
    // 2026-01-05 is a Monday, 2026-01-06 is a Tuesday.
    const apps = [
      ...Array.from({ length: 5 }, (_, i) =>
        app({
          id: `mon-${i}`,
          application_date: "2026-01-05",
          current_status: "HR Interview",
        })
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        app({
          id: `tue-${i}`,
          application_date: "2026-01-06",
          current_status: "Applied",
        })
      ),
    ];

    const insights = computeAdvancedInsights(apps, []);

    expect(insights.some((insight) => insight.includes("Monday"))).toBe(true);
  });
});
