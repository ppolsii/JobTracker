import { describe, expect, it } from "vitest";

import type {
  GroupStatisticsRow,
  StatusCountColumns,
} from "@/features/analytics/repositories/analytics.repository";
import {
  buildHistoryFactsByApplication,
  computeAverageHiringTimeDays,
  computeAverageOfferTimeDays,
  computeEmploymentTypeAnalytics,
  computeFunnelAnalytics,
  computeGroupAnalytics,
  computeGroupAnalyticsFromStatistics,
  computeInsights,
  computeOverview,
  computeTrendAnalysis,
  computeWorkModeAnalytics,
  deriveOverviewCounts,
} from "@/features/analytics/utils/analytics-calculations";
import type {
  AnalyticsApplicationRow,
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
} from "@/features/applications/types/application.types";

function app(
  overrides: Partial<AnalyticsApplicationRow> & { id: string }
): AnalyticsApplicationRow {
  return {
    company_id: "company-1",
    cv_version_id: "cv-1",
    source: null,
    work_mode: null,
    employment_type: null,
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
          offerEnteredAt: null,
          acceptedEnteredAt: null,
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

// Builds the StatusCountColumns a Phase 21 SQL view would return for a
// given set of apps - i.e. simulates the view's GROUP BY in plain JS, so
// the tests below can assert computeGroupAnalyticsFromStatistics produces
// results identical to computeGroupAnalytics for the same underlying data.
function statusCountsFor(apps: AnalyticsApplicationRow[]): StatusCountColumns {
  function count(status: ApplicationStatus): number {
    return apps.filter((a) => a.current_status === status).length;
  }
  return {
    wishlist_count: count("Wishlist"),
    applied_count: count("Applied"),
    recruiter_contact_count: count("Recruiter Contact"),
    hr_interview_count: count("HR Interview"),
    technical_interview_count: count("Technical Interview"),
    final_interview_count: count("Final Interview"),
    offer_count: count("Offer"),
    accepted_count: count("Accepted"),
    rejected_count: count("Rejected"),
    total_count: apps.length,
  };
}

describe("computeGroupAnalyticsFromStatistics", () => {
  it("produces results identical to computeGroupAnalytics for the same underlying applications (Phase 21 refactor parity)", () => {
    const apps = [
      app({ id: "a1", company_id: "c1", current_status: "Applied" }),
      app({ id: "a2", company_id: "c1", current_status: "HR Interview" }),
      app({ id: "a3", company_id: "c1", current_status: "Offer" }),
      app({ id: "a4", company_id: "c2", current_status: "Rejected" }),
      app({ id: "a5", company_id: "c2", current_status: "Accepted" }),
    ];
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a2",
        previous_status: "Applied",
        new_status: "HR Interview",
        changed_at: "2026-01-04T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "a3",
        previous_status: "Applied",
        new_status: "Recruiter Contact",
        changed_at: "2026-01-03T00:00:00.000Z",
      }),
    ]);

    const before = computeGroupAnalytics(
      apps,
      historyFacts,
      (a) => a.company_id,
      (a) => a.companies.name
    );

    const statisticsRows: GroupStatisticsRow[] = [
      { user_id: "user-1", id: "c1", name: "Acme", ...statusCountsFor(
        apps.filter((a) => a.company_id === "c1")
      ) },
      { user_id: "user-1", id: "c2", name: "Acme", ...statusCountsFor(
        apps.filter((a) => a.company_id === "c2")
      ) },
    ];

    const after = computeGroupAnalyticsFromStatistics(
      statisticsRows,
      apps,
      historyFacts,
      (a) => a.company_id
    );

    const sortById = (rows: typeof before) =>
      [...rows].sort((a, b) => a.id.localeCompare(b.id));

    expect(sortById(after)).toEqual(sortById(before));
  });

  it("returns null averageResponseTimeDays when no application in the group has responded", () => {
    const apps = [app({ id: "a1", company_id: "c1" })];
    const statisticsRows: GroupStatisticsRow[] = [
      {
        user_id: "user-1",
        id: "c1",
        name: "Acme",
        ...statusCountsFor(apps),
      },
    ];

    const rows = computeGroupAnalyticsFromStatistics(
      statisticsRows,
      apps,
      new Map(),
      (a) => a.company_id
    );

    expect(rows[0].averageResponseTimeDays).toBeNull();
  });
});

describe("deriveOverviewCounts", () => {
  it("matches computeOverview's expected input shape when a view row exists", () => {
    const counts = deriveOverviewCounts({
      wishlist_count: 0,
      applied_count: 1,
      recruiter_contact_count: 0,
      hr_interview_count: 1,
      technical_interview_count: 0,
      final_interview_count: 0,
      offer_count: 1,
      accepted_count: 0,
      rejected_count: 2,
      total_count: 5,
    });

    expect(counts).toEqual({
      total: 5,
      interviews: 2, // hr_interview_count + offer_count
      offers: 1,
      accepted: 0,
      responded: 4, // total - (wishlist + applied)
    });
  });

  it("defaults every count to zero when the view returns no row (no applications yet)", () => {
    expect(deriveOverviewCounts(null)).toEqual({
      total: 0,
      interviews: 0,
      offers: 0,
      accepted: 0,
      responded: 0,
    });
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

const NO_TIME_METRICS = {
  averageOfferTimeDays: null,
  averageHiringTimeDays: null,
};

describe("computeOverview", () => {
  it("gates Interview/Offer Rate behind the documented 5-application minimum", () => {
    const overview = computeOverview(
      {
        total: 4,
        interviews: 4,
        offers: 4,
        accepted: 0,
        responded: 4,
      },
      NO_TIME_METRICS
    );

    expect(overview.interviewRate.meetsMinimum).toBe(false);
    expect(overview.interviewRate.value).toBeNull();
    expect(overview.offerRate.meetsMinimum).toBe(false);
  });

  it("computes Interview/Offer Rate once the 5-application minimum is met", () => {
    const overview = computeOverview(
      {
        total: 5,
        interviews: 2,
        offers: 1,
        accepted: 0,
        responded: 3,
      },
      NO_TIME_METRICS
    );

    expect(overview.interviewRate.meetsMinimum).toBe(true);
    expect(overview.interviewRate.value).toBe(40);
    expect(overview.offerRate.value).toBe(20);
  });

  it("Response Rate has no minimum beyond having at least one application", () => {
    const overview = computeOverview(
      {
        total: 1,
        interviews: 0,
        offers: 0,
        accepted: 0,
        responded: 1,
      },
      NO_TIME_METRICS
    );

    expect(overview.responseRate.meetsMinimum).toBe(true);
    expect(overview.responseRate.value).toBe(100);
  });

  it("shows no Response Rate at all with zero applications", () => {
    const overview = computeOverview(
      {
        total: 0,
        interviews: 0,
        offers: 0,
        accepted: 0,
        responded: 0,
      },
      NO_TIME_METRICS
    );

    expect(overview.responseRate.meetsMinimum).toBe(false);
    expect(overview.responseRate.value).toBeNull();
  });

  it("computes Acceptance Rate as Accepted / Offers, gated only on having at least one offer", () => {
    const noOffers = computeOverview(
      { total: 5, interviews: 5, offers: 0, accepted: 0, responded: 5 },
      NO_TIME_METRICS
    );
    expect(noOffers.acceptanceRate.meetsMinimum).toBe(false);
    expect(noOffers.acceptanceRate.value).toBeNull();

    const withOffers = computeOverview(
      { total: 5, interviews: 5, offers: 2, accepted: 1, responded: 5 },
      NO_TIME_METRICS
    );
    expect(withOffers.acceptanceRate.meetsMinimum).toBe(true);
    expect(withOffers.acceptanceRate.value).toBe(50);
  });

  it("passes Average Offer/Hiring Time through unchanged", () => {
    const overview = computeOverview(
      { total: 1, interviews: 0, offers: 0, accepted: 0, responded: 0 },
      { averageOfferTimeDays: 12.5, averageHiringTimeDays: 30 }
    );
    expect(overview.averageOfferTimeDays).toBe(12.5);
    expect(overview.averageHiringTimeDays).toBe(30);
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

describe("computeAverageOfferTimeDays / computeAverageHiringTimeDays", () => {
  it("averages Application Date -> Offer / -> Accepted across all applications", () => {
    const apps = [
      app({ id: "a1", application_date: "2026-01-01" }),
      app({ id: "a2", application_date: "2026-01-01" }),
    ];
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a1",
        previous_status: "Final Interview",
        new_status: "Offer",
        changed_at: "2026-01-11T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "a1",
        previous_status: "Offer",
        new_status: "Accepted",
        changed_at: "2026-01-21T00:00:00.000Z",
      }),
      historyEntry({
        application_id: "a2",
        previous_status: "Final Interview",
        new_status: "Offer",
        changed_at: "2026-01-06T00:00:00.000Z",
      }),
    ]);

    // a1: 10 days (Jan 1 -> Jan 11), a2: 5 days (Jan 1 -> Jan 6) -> avg 7.5.
    expect(computeAverageOfferTimeDays(apps, historyFacts)).toBe(7.5);
    // Only a1 reached Accepted: 20 days (Jan 1 -> Jan 21).
    expect(computeAverageHiringTimeDays(apps, historyFacts)).toBe(20);
  });

  it("returns null when no application has reached that stage yet", () => {
    const apps = [app({ id: "a1" })];
    expect(computeAverageOfferTimeDays(apps, new Map())).toBeNull();
    expect(computeAverageHiringTimeDays(apps, new Map())).toBeNull();
  });
});

describe("computeWorkModeAnalytics", () => {
  it("groups by work_mode and computes Applications/Interview/Offer/Acceptance Rate", () => {
    const apps = [
      app({ id: "a1", work_mode: "Remote", current_status: "HR Interview" }),
      app({ id: "a2", work_mode: "Remote", current_status: "Offer" }),
      app({ id: "a3", work_mode: "Remote", current_status: "Accepted" }),
      app({ id: "a4", work_mode: "On Site", current_status: "Applied" }),
    ];

    const rows = computeWorkModeAnalytics(apps);
    const remote = rows.find((r) => r.id === "Remote")!;

    expect(remote.applications).toBe(3);
    // HR Interview, Offer, and Accepted are all interview-stage statuses.
    expect(remote.interviewRate).toBe(100);
    // Only Offer and Accepted count as offers.
    expect(remote.offerRate).toBe(66.7);
    // Acceptance Rate: Accepted / Offers (2), not Accepted / Applications (3).
    expect(remote.acceptanceRate).toBe(50);
  });

  it("excludes applications with no recorded work mode", () => {
    const apps = [app({ id: "a1", work_mode: null })];
    expect(computeWorkModeAnalytics(apps)).toHaveLength(0);
  });
});

describe("computeEmploymentTypeAnalytics", () => {
  it("groups by employment_type and computes Applications/Responses/Offers/Average Response Time", () => {
    const apps = [
      app({
        id: "a1",
        employment_type: "Full Time",
        current_status: "HR Interview",
      }),
      app({
        id: "a2",
        employment_type: "Full Time",
        current_status: "Applied",
      }),
    ];
    const historyFacts = buildHistoryFactsByApplication([
      historyEntry({
        application_id: "a1",
        previous_status: "Applied",
        new_status: "Recruiter Contact",
        changed_at: "2026-01-04T00:00:00.000Z",
      }),
    ]);

    const rows = computeEmploymentTypeAnalytics(apps, historyFacts);
    const fullTime = rows.find((r) => r.id === "Full Time")!;

    expect(fullTime.applications).toBe(2);
    expect(fullTime.responses).toBe(1);
    expect(fullTime.offers).toBe(0);
    expect(fullTime.averageResponseTimeDays).toBe(3);
  });

  it("excludes applications with no recorded employment type", () => {
    const apps = [app({ id: "a1", employment_type: null })];
    expect(computeEmploymentTypeAnalytics(apps, new Map())).toHaveLength(0);
  });
});

describe("computeTrendAnalysis", () => {
  it("returns null below the documented 2-month minimum", () => {
    expect(
      computeTrendAnalysis([
        {
          id: "2026-01",
          name: "2026-01",
          applications: 5,
          responses: 2,
          interviews: 1,
          offers: 0,
          accepted: 0,
          rejected: 0,
          responseRate: 40,
          interviewRate: 20,
          offerRate: 0,
          averageResponseTimeDays: null,
        },
      ])
    ).toBeNull();
  });

  it("compares the last two months present and expresses changes as percentages", () => {
    const trend = computeTrendAnalysis([
      {
        id: "2026-01",
        name: "2026-01",
        applications: 10,
        responses: 4,
        interviews: 2,
        offers: 1,
        accepted: 0,
        rejected: 0,
        responseRate: 40,
        interviewRate: 20,
        offerRate: 10,
        averageResponseTimeDays: null,
      },
      {
        id: "2026-02",
        name: "2026-02",
        applications: 15,
        responses: 6,
        interviews: 3,
        offers: 2,
        accepted: 0,
        rejected: 0,
        responseRate: 40,
        interviewRate: 20,
        offerRate: 13.3,
        averageResponseTimeDays: null,
      },
    ]);

    expect(trend).not.toBeNull();
    expect(trend!.currentMonth).toBe("2026-02");
    expect(trend!.previousMonth).toBe("2026-01");
    expect(trend!.applicationGrowth).toBe(50);
    expect(trend!.interviewGrowth).toBe(50);
    expect(trend!.offerGrowth).toBe(100);
    expect(trend!.responseGrowth).toBe(50);
  });

  it("returns null growth for a metric whose previous month was zero", () => {
    const trend = computeTrendAnalysis([
      {
        id: "2026-01",
        name: "2026-01",
        applications: 5,
        responses: 0,
        interviews: 0,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: 0,
        interviewRate: 0,
        offerRate: 0,
        averageResponseTimeDays: null,
      },
      {
        id: "2026-02",
        name: "2026-02",
        applications: 5,
        responses: 2,
        interviews: 1,
        offers: 0,
        accepted: 0,
        rejected: 0,
        responseRate: 40,
        interviewRate: 20,
        offerRate: 0,
        averageResponseTimeDays: null,
      },
    ]);

    expect(trend!.responseGrowth).toBeNull();
    expect(trend!.interviewGrowth).toBeNull();
    expect(trend!.offerGrowth).toBeNull();
  });
});
