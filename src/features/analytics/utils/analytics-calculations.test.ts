import { describe, expect, it } from "vitest";

import {
  buildHistoryFactsByApplication,
  computeFunnelAnalytics,
  computeGroupAnalytics,
  computeInsights,
  computeOverview,
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
    source: null,
    application_date: "2026-01-01",
    current_status: "Applied",
    companies: { name: "Acme" },
    cv_versions: { name: "Backend CV" },
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
    // Never asserted on - buildHistoryFactsByApplication keys everything by
    // application_id, not id. A fixed placeholder keeps this fixture
    // deterministic (Phase 17 self-review: "verify all tests are
    // deterministic") rather than a random value that adds no test value.
    id: "history-entry",
    previous_status: null,
    changed_at: "2026-01-02T00:00:00.000Z",
    created_by: "user-1",
    ...overrides,
  };
}

describe("buildHistoryFactsByApplication", () => {
  it("records respondedAt as the timestamp of the transition out of Applied", () => {
    const facts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "app-1",
        previous_status: null,
        new_status: "Applied",
        changed_at: "2026-01-01T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "app-1",
        previous_status: "Applied",
        new_status: "Recruiter Contact",
        changed_at: "2026-01-05T00:00:00.000Z",
      }),
    ]);

    expect(facts.get("app-1")?.respondedAt).toBe("2026-01-05T00:00:00.000Z");
  });

  it("does not set respondedAt for an application still sitting in Applied", () => {
    const facts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "app-1",
        previous_status: null,
        new_status: "Applied",
      }),
    ]);

    expect(facts.get("app-1")?.respondedAt).toBeNull();
  });

  it("records which stage a Rejected transition came from", () => {
    const facts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "app-1",
        previous_status: null,
        new_status: "Applied",
      }),
      historyEntry({
        application_id: "app-1",
        previous_status: "Applied",
        new_status: "Rejected",
      }),
    ]);

    expect(facts.get("app-1")?.rejectedFromStage).toBe("Applied");
  });

  it("accumulates every status the application ever entered", () => {
    const facts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "app-1",
        previous_status: null,
        new_status: "Applied",
      }),
      historyEntry({
        application_id: "app-1",
        previous_status: "Applied",
        new_status: "Recruiter Contact",
      }),
    ]);

    expect([...(facts.get("app-1")?.enteredStatuses ?? [])]).toEqual([
      "Applied",
      "Recruiter Contact",
    ]);
  });
});

describe("computeGroupAnalytics", () => {
  it("groups applications by the given key and computes counts/rates per group", () => {
    const apps = [
      app({ id: "a1", company_id: "c1", current_status: "Applied" }),
      app({ id: "a2", company_id: "c1", current_status: "HR Interview" }),
      app({ id: "a3", company_id: "c2", current_status: "Rejected" }),
    ];

    const rows = computeGroupAnalytics(
      apps,
      new Map(),
      (a) => a.company_id,
      (a) => a.companies.name
    );

    const c1 = rows.find((r) => r.id === "c1")!;
    expect(c1.applications).toBe(2);
    // "Applied" is unresponded (BUSINESS_RULES.md/ANALYTICS_ENGINE.md
    // "Response Rate": anything after Applied counts as a response), "HR
    // Interview" does count as a response and as an interview.
    expect(c1.responses).toBe(1);
    expect(c1.interviews).toBe(1);
    expect(c1.responseRate).toBe(50);

    const c2 = rows.find((r) => r.id === "c2")!;
    expect(c2.applications).toBe(1);
    expect(c2.rejected).toBe(1);
  });

  it("excludes applications whose key resolves to null (e.g. no recorded source)", () => {
    const apps = [
      app({ id: "a1", source: null }),
      app({ id: "a2", source: "LinkedIn" }),
    ];

    const rows = computeGroupAnalytics(
      apps,
      new Map(),
      (a) => a.source,
      (a) => a.source ?? ""
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("LinkedIn");
  });

  it("computes average response time in days from history facts", () => {
    const apps = [
      app({ id: "a1", company_id: "c1", application_date: "2026-01-01" }),
    ];
    const historyFacts = new Map([
      [
        "a1",
        {
          respondedAt: "2026-01-04T00:00:00.000Z",
          enteredStatuses: new Set<AnalyticsApplicationRow["current_status"]>(),
          rejectedFromStage: null,
        },
      ],
    ]);

    const rows = computeGroupAnalytics(
      apps,
      historyFacts,
      (a) => a.company_id,
      (a) => a.companies.name
    );

    expect(rows[0].averageResponseTimeDays).toBe(3);
  });

  it("returns null averageResponseTimeDays when no application in the group has responded", () => {
    const apps = [app({ id: "a1" })];

    const rows = computeGroupAnalytics(
      apps,
      new Map(),
      () => "k",
      () => "name"
    );

    expect(rows[0].averageResponseTimeDays).toBeNull();
  });
});

describe("computeFunnelAnalytics", () => {
  it("counts entering/progressing/rejected per stage from history facts", () => {
    const apps = [app({ id: "a1" }), app({ id: "a2" })];
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a1",
        previous_status: null,
        new_status: "Applied",
      }),
      historyEntry({
        application_id: "a1",
        previous_status: "Applied",
        new_status: "Recruiter Contact",
      }),
      historyEntry({
        application_id: "a2",
        previous_status: null,
        new_status: "Applied",
      }),
      historyEntry({
        application_id: "a2",
        previous_status: "Applied",
        new_status: "Rejected",
      }),
    ]);

    const funnel = computeFunnelAnalytics(apps, historyFacts);
    const applied = funnel.find((f) => f.stage === "Applied")!;

    expect(applied.entering).toBe(2);
    expect(applied.progressing).toBe(1);
    expect(applied.rejected).toBe(1);
    expect(applied.dropOffRate).toBe(50);
  });

  it("gives the final stage (Accepted) no progression column, since there is no next stage", () => {
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a1",
        previous_status: null,
        new_status: "Applied",
      }),
      historyEntry({
        application_id: "a1",
        previous_status: "Applied",
        new_status: "Accepted",
      }),
    ]);

    const funnel = computeFunnelAnalytics([app({ id: "a1" })], historyFacts);
    const accepted = funnel.find((f) => f.stage === "Accepted")!;

    expect(accepted.progressing).toBe(0);
    expect(accepted.conversionRate).toBeNull();
  });
});

describe("computeOverview", () => {
  it("gates Interview/Offer Rate behind the documented 5-application minimum", () => {
    const overview = computeOverview({
      total: 4,
      interviews: 4,
      offers: 4,
      responded: 4,
    });

    expect(overview.interviewRate.meetsMinimum).toBe(false);
    expect(overview.interviewRate.value).toBeNull();
    expect(overview.offerRate.meetsMinimum).toBe(false);
  });

  it("computes Interview/Offer Rate once the 5-application minimum is met", () => {
    const overview = computeOverview({
      total: 5,
      interviews: 2,
      offers: 1,
      responded: 3,
    });

    expect(overview.interviewRate.meetsMinimum).toBe(true);
    expect(overview.interviewRate.value).toBe(40);
    expect(overview.offerRate.value).toBe(20);
  });

  it("Response Rate has no minimum beyond having at least one application", () => {
    const overview = computeOverview({
      total: 1,
      interviews: 0,
      offers: 0,
      responded: 1,
    });

    expect(overview.responseRate.meetsMinimum).toBe(true);
    expect(overview.responseRate.value).toBe(100);
  });

  it("shows no Response Rate at all with zero applications", () => {
    const overview = computeOverview({
      total: 0,
      interviews: 0,
      offers: 0,
      responded: 0,
    });

    expect(overview.responseRate.meetsMinimum).toBe(false);
    expect(overview.responseRate.value).toBeNull();
  });
});

describe("computeInsights", () => {
  it("never speculates below the documented minimum sample sizes", () => {
    const belowMinimumCv = [
      {
        id: "cv1",
        name: "Backend",
        applications: 2,
        responses: 0,
        interviews: 1,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: null,
        interviewRate: 50,
        offerRate: null,
        averageResponseTimeDays: null,
      },
    ];

    const insights = computeInsights(belowMinimumCv, [], [], []);

    expect(insights).toHaveLength(0);
  });

  it("compares the top two CVs by Interview Rate once both meet the 10-application minimum", () => {
    const cvAnalytics = [
      {
        id: "cv1",
        name: "Backend",
        applications: 10,
        responses: 5,
        interviews: 6,
        offers: 1,
        accepted: 0,
        rejected: 0,
        responseRate: 50,
        interviewRate: 60,
        offerRate: 10,
        averageResponseTimeDays: null,
      },
      {
        id: "cv2",
        name: "Full Stack",
        applications: 10,
        responses: 3,
        interviews: 3,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: 30,
        interviewRate: 30,
        offerRate: 0,
        averageResponseTimeDays: null,
      },
    ];

    const insights = computeInsights(cvAnalytics, [], [], []);

    expect(insights).toEqual([
      "Your Backend CV receives interviews 30 percentage points more often than your Full Stack CV.",
    ]);
  });

  it("names the highest drop-off funnel stage only when a real drop-off exists", () => {
    const funnel = [
      {
        stage: "Applied" as const,
        entering: 10,
        progressing: 8,
        rejected: 2,
        conversionRate: 80,
        dropOffRate: 20,
      },
      {
        stage: "Recruiter Contact" as const,
        entering: 8,
        progressing: 8,
        rejected: 0,
        conversionRate: 100,
        dropOffRate: 0,
      },
    ];

    const insights = computeInsights([], [], [], funnel);

    expect(insights).toEqual([
      "You most often exit the recruitment process during Applied.",
    ]);
  });

  it("returns no insights at all when nothing qualifies", () => {
    expect(computeInsights([], [], [], [])).toEqual([]);
  });
});
