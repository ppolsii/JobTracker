import {
  FUNNEL_STAGES,
  MIN_SAMPLE_COMPANY_COMPARISON,
  MIN_SAMPLE_CV_COMPARISON,
  MIN_SAMPLE_INTERVIEW_OFFER_RATE,
  MIN_SAMPLE_TREND_MONTHS,
} from "@/features/analytics/constants/analytics.constants";
import type {
  GroupStatisticsRow,
  StatusCountColumns,
} from "@/features/analytics/repositories/analytics.repository";
import type {
  AnalyticsOverview,
  EmploymentTypeAnalyticsRow,
  FunnelStageRow,
  GroupAnalyticsRow,
  RateMetric,
  TrendAnalysis,
  WorkModeAnalyticsRow,
} from "@/features/analytics/types/analytics.types";
import {
  INTERVIEW_STAGE_STATUSES,
  OFFER_STAGE_STATUSES,
  UNRESPONDED_STATUSES,
} from "@/features/applications/constants/application.constants";
import type {
  AnalyticsApplicationRow,
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";

// Pure calculation helpers for AnalyticsService (Phase 12) - no Supabase
// access, no I/O, nothing feature-agnostic enough for shared/ (every
// function here is defined entirely in terms of ANALYTICS_ENGINE.md's
// Applications domain). Split out of analytics.service.ts, which otherwise
// exceeded CODE_STYLE.md's 300-line file-size target, keeping that file
// focused on orchestration (fetching + calling these) only.

export interface ApplicationHistoryFacts {
  respondedAt: string | null;
  // IMPLEMENTATION_ORDER_V2.md Phase 29 - ANALYTICS_ENGINE.md "Average Offer
  // Time"/"Average Hiring Time": the timestamp an application first entered
  // Offer/Accepted. Each is set at most once per application - Offer's only
  // outgoing transitions are to Accepted or Rejected, and Accepted is
  // terminal (APPLICATION_STATUS_TRANSITIONS has no path back into either),
  // so a single recorded timestamp is exact, not just the "most recent" one.
  offerEnteredAt: string | null;
  acceptedEnteredAt: string | null;
  enteredStatuses: Set<ApplicationStatus>;
  rejectedFromStage: ApplicationStatus | null;
}

// Builds, per application, exactly the facts every downstream calculation
// needs from its status history - one pass over the bulk history fetch
// instead of each calculation re-scanning it.
export function buildHistoryFactsByApplication(
  history: ApplicationStatusHistoryEntry[]
): Map<string, ApplicationHistoryFacts> {
  const facts = new Map<string, ApplicationHistoryFacts>();

  for (const entry of history) {
    const current = facts.get(entry.application_id) ?? {
      respondedAt: null,
      offerEnteredAt: null,
      acceptedEnteredAt: null,
      enteredStatuses: new Set<ApplicationStatus>(),
      rejectedFromStage: null,
    };

    current.enteredStatuses.add(entry.new_status);

    // ANALYTICS_ENGINE.md "Average Response Time": "Application Date ->
    // First Response". The transition OUT of Applied is, by definition,
    // the first response - Applied has exactly one outgoing edge per
    // application (APPLICATION_STATUS_TRANSITIONS never re-enters Applied).
    if (entry.previous_status === "Applied") {
      current.respondedAt = entry.changed_at;
    }

    if (entry.new_status === "Offer") {
      current.offerEnteredAt = entry.changed_at;
    }

    if (entry.new_status === "Accepted") {
      current.acceptedEnteredAt = entry.changed_at;
    }

    if (entry.new_status === "Rejected" && entry.previous_status !== null) {
      current.rejectedFromStage = entry.previous_status;
    }

    facts.set(entry.application_id, current);
  }

  return facts;
}

function daysBetween(startDate: string, endTimestamp: string): number {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endTimestamp).getTime();
  return (endMs - startMs) / (1000 * 60 * 60 * 24);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return roundTo((numerator / denominator) * 100, 1);
}

// Generic "Application Date -> some later event" average, shared by Average
// Response/Offer/Hiring Time (ANALYTICS_ENGINE.md "Time Metrics") - the three
// differ only in which `ApplicationHistoryFacts` timestamp they read.
function computeAverageDaysBetween(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>,
  eventAtOf: (facts: ApplicationHistoryFacts) => string | null
): number | null {
  const samples: number[] = [];

  for (const app of apps) {
    if (!app.application_date) continue;
    const facts = historyFacts.get(app.id);
    const eventAt = facts && eventAtOf(facts);
    if (!eventAt) continue;
    samples.push(daysBetween(app.application_date, eventAt));
  }

  if (samples.length === 0) return null;
  const average = samples.reduce((sum, days) => sum + days, 0) / samples.length;
  return roundTo(average, 1);
}

function computeAverageResponseTimeDays(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): number | null {
  return computeAverageDaysBetween(apps, historyFacts, (facts) => facts.respondedAt);
}

// ANALYTICS_ENGINE.md "Average Offer Time"/"Average Hiring Time": computed
// globally across the whole account (unlike Average Response Time, which is
// also produced per Company/CV/Source/Monthly grouping) - see
// AnalyticsService for where these are called.
export function computeAverageOfferTimeDays(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): number | null {
  return computeAverageDaysBetween(apps, historyFacts, (facts) => facts.offerEnteredAt);
}

export function computeAverageHiringTimeDays(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): number | null {
  return computeAverageDaysBetween(apps, historyFacts, (facts) => facts.acceptedEnteredAt);
}

// Shared by Company/CV/Source/Monthly Analytics (ANALYTICS_ENGINE.md defines
// the identical set of calculated columns for all four groupings) - one
// generic aggregator, not four parallel copies of the same reduce logic.
export function computeGroupAnalytics(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>,
  keyOf: (app: AnalyticsApplicationRow) => string | null,
  nameOf: (app: AnalyticsApplicationRow) => string
): GroupAnalyticsRow[] {
  const groups = new Map<
    string,
    { name: string; apps: AnalyticsApplicationRow[] }
  >();

  for (const app of apps) {
    const key = keyOf(app);
    if (!key) continue;
    const group = groups.get(key) ?? { name: nameOf(app), apps: [] };
    group.apps.push(app);
    groups.set(key, group);
  }

  const rows: GroupAnalyticsRow[] = [];
  for (const [id, group] of groups) {
    const total = group.apps.length;
    const responses = group.apps.filter(
      (app) => !UNRESPONDED_STATUSES.includes(app.current_status)
    ).length;
    const interviews = group.apps.filter((app) =>
      INTERVIEW_STAGE_STATUSES.includes(app.current_status)
    ).length;
    const offers = group.apps.filter((app) =>
      OFFER_STAGE_STATUSES.includes(app.current_status)
    ).length;
    const accepted = group.apps.filter(
      (app) => app.current_status === "Accepted"
    ).length;
    const rejected = group.apps.filter(
      (app) => app.current_status === "Rejected"
    ).length;

    rows.push({
      id,
      name: group.name,
      applications: total,
      responses,
      interviews,
      offers,
      accepted,
      rejected,
      responseRate: toRate(responses, total),
      interviewRate: toRate(interviews, total),
      offerRate: toRate(offers, total),
      averageResponseTimeDays: computeAverageResponseTimeDays(
        group.apps,
        historyFacts
      ),
    });
  }

  return rows;
}

// IMPLEMENTATION_ORDER_V2.md Phase 21: maps each application_status to the
// matching column on a Phase 21 statistics view row. Purely a column-name
// lookup, not a categorisation decision - INTERVIEW_STAGE_STATUSES/
// OFFER_STAGE_STATUSES/UNRESPONDED_STATUSES (imported above, unchanged)
// remain the single source of truth for which statuses mean what; this map
// only tells sumStatusCounts where to find each status's count.
const STATUS_COUNT_COLUMN_BY_STATUS: Record<
  ApplicationStatus,
  keyof StatusCountColumns
> = {
  Wishlist: "wishlist_count",
  Applied: "applied_count",
  "Recruiter Contact": "recruiter_contact_count",
  "HR Interview": "hr_interview_count",
  "Technical Interview": "technical_interview_count",
  "Final Interview": "final_interview_count",
  Offer: "offer_count",
  Accepted: "accepted_count",
  Rejected: "rejected_count",
};

function sumStatusCounts(
  row: StatusCountColumns,
  statuses: ApplicationStatus[]
): number {
  return statuses.reduce(
    (sum, status) => sum + row[STATUS_COUNT_COLUMN_BY_STATUS[status]],
    0
  );
}

// Company/CV/Monthly Analytics (Phase 21): counts/rates are now sourced
// from a Phase 21 statistics view (one row per group, GROUP BY in SQL)
// instead of being filtered/counted here - same numbers, computed by the
// database instead of by iterating `apps`. Average Response Time still
// needs per-application history data the views don't carry, so `apps` is
// still grouped by the same key here, purely to feed
// computeAverageResponseTimeDays (unchanged) per group. Source Analytics
// has no corresponding view (DATABASE.md reserves no `source_statistics`
// name) and keeps using computeGroupAnalytics above, unchanged.
export function computeGroupAnalyticsFromStatistics(
  statisticsRows: GroupStatisticsRow[],
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>,
  keyOf: (app: AnalyticsApplicationRow) => string | null
): GroupAnalyticsRow[] {
  const appsByGroup = new Map<string, AnalyticsApplicationRow[]>();
  for (const app of apps) {
    const key = keyOf(app);
    if (!key) continue;
    const group = appsByGroup.get(key) ?? [];
    group.push(app);
    appsByGroup.set(key, group);
  }

  return statisticsRows.map((row) => {
    const responses = row.total_count - sumStatusCounts(row, UNRESPONDED_STATUSES);
    const interviews = sumStatusCounts(row, INTERVIEW_STAGE_STATUSES);
    const offers = sumStatusCounts(row, OFFER_STAGE_STATUSES);

    return {
      id: row.id,
      name: row.name,
      applications: row.total_count,
      responses,
      interviews,
      offers,
      accepted: row.accepted_count,
      rejected: row.rejected_count,
      responseRate: toRate(responses, row.total_count),
      interviewRate: toRate(interviews, row.total_count),
      offerRate: toRate(offers, row.total_count),
      averageResponseTimeDays: computeAverageResponseTimeDays(
        appsByGroup.get(row.id) ?? [],
        historyFacts
      ),
    };
  });
}

// Overview (Phase 21): the same {total, interviews, offers, responded}
// shape computeOverview (below) has always taken, now derived from the
// dashboard_metrics view instead of ApplicationStatsService.getDashboardCounts.
// No row is returned by the view when the user has no applications, same as
// any other GROUP BY over zero matching rows - defaults to all zeros.
export function deriveOverviewCounts(row: StatusCountColumns | null): {
  total: number;
  interviews: number;
  offers: number;
  accepted: number;
  responded: number;
} {
  if (!row) {
    return { total: 0, interviews: 0, offers: 0, accepted: 0, responded: 0 };
  }
  return {
    total: row.total_count,
    interviews: sumStatusCounts(row, INTERVIEW_STAGE_STATUSES),
    offers: sumStatusCounts(row, OFFER_STAGE_STATUSES),
    accepted: row.accepted_count,
    responded: row.total_count - sumStatusCounts(row, UNRESPONDED_STATUSES),
  };
}

// ANALYTICS_ENGINE.md "Work Mode Analytics": "Group applications by: Remote,
// Hybrid, On Site. Calculate: Applications, Interview Rate, Offer Rate,
// Acceptance Rate." No `work_mode_statistics` view exists (DATABASE.md
// reserves no such name), so - exactly like Source Analytics - this groups
// the same bulk analytics fetch in application code. Applications with no
// recorded work mode are excluded, the same treatment Source Analytics gives
// applications with no recorded source.
export function computeWorkModeAnalytics(
  apps: AnalyticsApplicationRow[]
): WorkModeAnalyticsRow[] {
  const groups = new Map<WorkMode, AnalyticsApplicationRow[]>();
  for (const app of apps) {
    if (!app.work_mode) continue;
    const group = groups.get(app.work_mode) ?? [];
    group.push(app);
    groups.set(app.work_mode, group);
  }

  const rows: WorkModeAnalyticsRow[] = [];
  for (const [workMode, groupApps] of groups) {
    const total = groupApps.length;
    const interviews = groupApps.filter((app) =>
      INTERVIEW_STAGE_STATUSES.includes(app.current_status)
    ).length;
    const offers = groupApps.filter((app) =>
      OFFER_STAGE_STATUSES.includes(app.current_status)
    ).length;
    const accepted = groupApps.filter(
      (app) => app.current_status === "Accepted"
    ).length;

    rows.push({
      id: workMode,
      name: workMode,
      applications: total,
      interviewRate: toRate(interviews, total),
      offerRate: toRate(offers, total),
      // Same "Offers" denominator as the top-level Acceptance Rate, not Total
      // Applications.
      acceptanceRate: toRate(accepted, offers),
    });
  }

  return rows;
}

// ANALYTICS_ENGINE.md "Employment Type Analytics": "Group applications by:
// Full Time, Part Time, Internship, Contract, Freelance. Calculate:
// Applications, Responses, Offers, Average Response Time." Same "no matching
// SQL view, group the bulk fetch in application code" treatment as Work Mode
// Analytics above.
export function computeEmploymentTypeAnalytics(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): EmploymentTypeAnalyticsRow[] {
  const groups = new Map<EmploymentType, AnalyticsApplicationRow[]>();
  for (const app of apps) {
    if (!app.employment_type) continue;
    const group = groups.get(app.employment_type) ?? [];
    group.push(app);
    groups.set(app.employment_type, group);
  }

  const rows: EmploymentTypeAnalyticsRow[] = [];
  for (const [employmentType, groupApps] of groups) {
    const total = groupApps.length;
    const responses = groupApps.filter(
      (app) => !UNRESPONDED_STATUSES.includes(app.current_status)
    ).length;
    const offers = groupApps.filter((app) =>
      OFFER_STAGE_STATUSES.includes(app.current_status)
    ).length;

    rows.push({
      id: employmentType,
      name: employmentType,
      applications: total,
      responses,
      offers,
      averageResponseTimeDays: computeAverageResponseTimeDays(
        groupApps,
        historyFacts
      ),
    });
  }

  return rows;
}

function computeGrowthPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundTo(((current - previous) / previous) * 100, 1);
}

// ANALYTICS_ENGINE.md "Trend Analysis": "Compare current month against
// previous month... Represent changes as percentages." Reuses
// `monthlyAnalytics` (already computed via the `monthly_statistics` view)
// rather than re-deriving month-by-month counts - "Do not duplicate
// analytics calculations in multiple places". `monthlyRows` must already be
// sorted ascending by month (AnalyticsService sorts `monthlyAnalytics` this
// way already); "current"/"previous" are simply the last two entries present
// - months with zero applications never appear as rows (the view only
// emits a row per month that has data), so a gap month is not invented.
export function computeTrendAnalysis(
  monthlyRows: GroupAnalyticsRow[]
): TrendAnalysis | null {
  if (monthlyRows.length < MIN_SAMPLE_TREND_MONTHS) return null;

  const previous = monthlyRows[monthlyRows.length - 2];
  const current = monthlyRows[monthlyRows.length - 1];

  return {
    currentMonth: current.id,
    previousMonth: previous.id,
    applicationGrowth: computeGrowthPercent(
      current.applications,
      previous.applications
    ),
    interviewGrowth: computeGrowthPercent(
      current.interviews,
      previous.interviews
    ),
    offerGrowth: computeGrowthPercent(current.offers, previous.offers),
    responseGrowth: computeGrowthPercent(
      current.responses,
      previous.responses
    ),
  };
}

// ANALYTICS_ENGINE.md "Funnel Analytics": for each of the 7 stages, how many
// applications ever entered it (per history, not current_status - a later-
// rejected application still "entered" every stage it passed through),
// how many progressed to the next stage, and how many were rejected
// specifically from that stage.
export function computeFunnelAnalytics(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): FunnelStageRow[] {
  return FUNNEL_STAGES.map((stage, index) => {
    const nextStage = FUNNEL_STAGES[index + 1];
    let entering = 0;
    let progressing = 0;
    let rejectedFromStage = 0;

    for (const app of apps) {
      const facts = historyFacts.get(app.id);
      if (!facts?.enteredStatuses.has(stage)) continue;

      entering += 1;
      if (nextStage && facts.enteredStatuses.has(nextStage)) {
        progressing += 1;
      }
      if (facts.rejectedFromStage === stage) {
        rejectedFromStage += 1;
      }
    }

    return {
      stage,
      entering,
      progressing: nextStage ? progressing : 0,
      rejected: rejectedFromStage,
      conversionRate: nextStage ? toRate(progressing, entering) : null,
      dropOffRate: toRate(rejectedFromStage, entering),
    };
  });
}

export function computeOverview(
  counts: {
    total: number;
    interviews: number;
    offers: number;
    accepted: number;
    responded: number;
  },
  timeMetrics: { averageOfferTimeDays: number | null; averageHiringTimeDays: number | null }
): AnalyticsOverview {
  const meetsInterviewOfferMinimum =
    counts.total >= MIN_SAMPLE_INTERVIEW_OFFER_RATE;

  function metric(
    numerator: number,
    denominator: number,
    meetsMinimum: boolean
  ): RateMetric {
    return {
      value: meetsMinimum ? toRate(numerator, denominator) : null,
      sampleSize: denominator,
      meetsMinimum,
    };
  }

  return {
    // ANALYTICS_ENGINE.md's "Minimum Data Requirements" names no threshold
    // for Response Rate specifically - only guards the trivial "no
    // applications at all" case.
    responseRate: metric(counts.responded, counts.total, counts.total > 0),
    interviewRate: metric(counts.interviews, counts.total, meetsInterviewOfferMinimum),
    offerRate: metric(counts.offers, counts.total, meetsInterviewOfferMinimum),
    // ANALYTICS_ENGINE.md "Acceptance Rate": "Accepted Offers / Offers" - the
    // denominator is Offers, not Total Applications, unlike the three rates
    // above. No minimum sample size is documented for it, so it's only
    // guarded against the trivial "no offers yet" divide-by-zero case.
    acceptanceRate: metric(counts.accepted, counts.offers, counts.offers > 0),
    averageOfferTimeDays: timeMetrics.averageOfferTimeDays,
    averageHiringTimeDays: timeMetrics.averageHiringTimeDays,
  };
}

// ANALYTICS_ENGINE.md "Insights": deterministic sentences only, each gated
// by the documented minimum sample size for the comparison it draws on.
// Folds in FEATURES.md's "Most Successful CV/Source/Company" (ANALYTICS_
// ENGINE.md's separately-named "Best Performing CV"/"Best Application
// Source"/"Best Company" sections) as insight content, rather than a
// separate ranked-badge feature - see CHANGELOG "Technical decisions".
export function computeInsights(
  cvAnalytics: GroupAnalyticsRow[],
  sourceAnalytics: GroupAnalyticsRow[],
  companyAnalytics: GroupAnalyticsRow[],
  funnel: FunnelStageRow[]
): string[] {
  const insights: string[] = [];

  // "Best Performing CV": ranking priority Interview Rate -> Offer Rate ->
  // Acceptance Rate (Accepted / Offers), minimum 10 applications.
  const qualifyingCvs = cvAnalytics
    .filter((cv) => cv.applications >= MIN_SAMPLE_CV_COMPARISON)
    .sort((a, b) => {
      const interviewDiff = (b.interviewRate ?? 0) - (a.interviewRate ?? 0);
      if (interviewDiff !== 0) return interviewDiff;
      const offerDiff = (b.offerRate ?? 0) - (a.offerRate ?? 0);
      if (offerDiff !== 0) return offerDiff;
      const acceptanceA = a.offers > 0 ? a.accepted / a.offers : 0;
      const acceptanceB = b.offers > 0 ? b.accepted / b.offers : 0;
      return acceptanceB - acceptanceA;
    });

  if (qualifyingCvs.length >= 2) {
    const [best, second] = qualifyingCvs;
    const diff = roundTo(
      (best.interviewRate ?? 0) - (second.interviewRate ?? 0),
      1
    );
    insights.push(
      `Your ${best.name} CV receives interviews ${diff} percentage points more often than your ${second.name} CV.`
    );
  } else if (qualifyingCvs.length === 1) {
    insights.push(
      `Your best-performing CV is ${qualifyingCvs[0].name}, with a ${qualifyingCvs[0].interviewRate}% interview rate.`
    );
  }

  // "Best Application Source": highest interview rate. ANALYTICS_ENGINE.md
  // names no source-specific minimum, so the general Interview Rate
  // minimum (5) is reused rather than inventing a new threshold.
  const qualifyingSources = sourceAnalytics
    .filter(
      (source) =>
        source.applications >= MIN_SAMPLE_INTERVIEW_OFFER_RATE &&
        source.interviewRate !== null
    )
    .sort((a, b) => (b.interviewRate ?? 0) - (a.interviewRate ?? 0));
  if (qualifyingSources.length > 0) {
    insights.push(
      `${qualifyingSources[0].name} generates your highest interview rate, at ${qualifyingSources[0].interviewRate}%.`
    );
  }

  // "Best Company": highest response rate, minimum 3 applications.
  const qualifyingCompanies = companyAnalytics
    .filter(
      (company) =>
        company.applications >= MIN_SAMPLE_COMPANY_COMPARISON &&
        company.responseRate !== null
    )
    .sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0));
  if (qualifyingCompanies.length > 0) {
    insights.push(
      `${qualifyingCompanies[0].name} has your highest response rate, at ${qualifyingCompanies[0].responseRate}%.`
    );
  }

  // Funnel: the stage with the highest drop-off rate.
  const stagesWithDropOff = funnel.filter(
    (stage) => stage.entering > 0 && (stage.dropOffRate ?? 0) > 0
  );
  if (stagesWithDropOff.length > 0) {
    const worst = [...stagesWithDropOff].sort(
      (a, b) => (b.dropOffRate ?? 0) - (a.dropOffRate ?? 0)
    )[0];
    insights.push(
      `You most often exit the recruitment process during ${worst.stage}.`
    );
  }

  return insights;
}
