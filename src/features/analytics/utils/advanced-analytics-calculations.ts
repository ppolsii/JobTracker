import {
  MIN_SAMPLE_COMPANY_COMPARISON,
  MIN_SAMPLE_INTERVIEW_OFFER_RATE,
} from "@/features/analytics/constants/analytics.constants";
import {
  COMPANY_RANKING_SIZE,
  RECENT_ACTIVITY_WEEKS,
  SALARY_DISTRIBUTION_BUCKET_COUNT,
} from "@/features/analytics/constants/advanced-analytics.constants";
import type {
  ActivityAnalysis,
  AdvancedAnalyticsFilters,
  CompanyRanking,
  MonthActivity,
  ProcessDurations,
  SalaryAnalysis,
  SalaryByGroupRow,
  SalaryDistributionBucket,
  SalaryStatistics,
  TimelineAnalysis,
  TimelineStep,
  WeeklyActivity,
} from "@/features/analytics/types/advanced-analytics.types";
import type {
  GroupAnalyticsRow,
  WorkModeAnalyticsRow,
} from "@/features/analytics/types/analytics.types";
import {
  type ApplicationHistoryFacts,
  computeAverageDaysBetweenEvents,
  daysBetween,
  roundTo,
  toRate,
} from "@/features/analytics/utils/analytics-calculations";
import { INTERVIEW_STAGE_STATUSES } from "@/features/applications/constants/application.constants";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";

// Pure calculation helpers for Advanced Analytics (IMPLEMENTATION_ORDER_V2.md
// Phase 33). Mirrors analytics-calculations.ts's own split from
// analytics.service.ts: no Supabase access, no I/O - AnalyticsService.
// getAdvancedSummary is the only caller. Every function here reuses the
// same bulk applications/history data the base Analytics page already
// fetches (ApplicationService.listAllForAnalytics /
// ApplicationStatusService.listHistoryForApplications) - no new Repository
// method was added for this phase.

// "FILTERS": applied once, in memory, before any of the calculations below
// run - the four existing statistics views (dashboard_metrics/company_/cv_/
// monthly_statistics) have no filter parameters of their own, so filtered
// Company/CV/Work Mode/Employment Type breakdowns reuse the same bulk-fetch
// computation path Source Analytics already established (computeGroupAnalytics/
// computeWorkModeAnalytics/computeEmploymentTypeAnalytics), fed a filtered
// subset of `apps` - not a new aggregation mechanism.
export function filterApplicationsForAdvancedAnalytics(
  apps: AnalyticsApplicationRow[],
  filters: AdvancedAnalyticsFilters
): AnalyticsApplicationRow[] {
  return apps.filter((app) => {
    if (filters.dateFrom) {
      if (!app.application_date || app.application_date < filters.dateFrom) {
        return false;
      }
    }
    if (filters.dateTo) {
      if (!app.application_date || app.application_date > filters.dateTo) {
        return false;
      }
    }
    if (filters.companyId && app.company_id !== filters.companyId) return false;
    if (filters.cvVersionId && app.cv_version_id !== filters.cvVersionId) {
      return false;
    }
    if (filters.workMode && app.work_mode !== filters.workMode) return false;
    if (
      filters.employmentType &&
      app.employment_type !== filters.employmentType
    ) {
      return false;
    }
    if (filters.status && app.current_status !== filters.status) return false;
    return true;
  });
}

function median(sortedValues: number[]): number | null {
  if (sortedValues.length === 0) return null;
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];
}

// "SECTION 2 Company Performance": "top companies"/"worst companies" -
// ranked by Interview Rate among companies meeting the same minimum sample
// size Company Analytics already uses (MIN_SAMPLE_COMPANY_COMPARISON), so a
// company with only one or two applications never appears in either list.
// `companyRows` is the caller's already-computed Company Analytics
// (computeGroupAnalytics fed the filtered apps) - this only ranks it, it
// does not recompute it.
export function rankCompanies(companyRows: GroupAnalyticsRow[]): CompanyRanking {
  const qualifying = companyRows.filter(
    (row) => row.applications >= MIN_SAMPLE_COMPANY_COMPARISON
  );
  const sortedByInterviewRate = [...qualifying].sort(
    (a, b) => (b.interviewRate ?? -1) - (a.interviewRate ?? -1)
  );

  const withResponseTime = companyRows.filter(
    (row) => row.averageResponseTimeDays !== null
  );
  const averageResponseTimeDays =
    withResponseTime.length > 0
      ? roundTo(
          withResponseTime.reduce(
            (sum, row) => sum + (row.averageResponseTimeDays ?? 0),
            0
          ) / withResponseTime.length,
          1
        )
      : null;

  return {
    top: sortedByInterviewRate.slice(0, COMPANY_RANKING_SIZE),
    worst: [...sortedByInterviewRate]
      .reverse()
      .slice(0, COMPANY_RANKING_SIZE),
    averageResponseTimeDays,
  };
}

// "SECTION 4 Timeline Analysis": average days between each consecutive
// stage, reusing computeAverageDaysBetweenEvents (analytics-calculations.ts)
// for each step - the same day-counting/rounding logic Average Response/
// Offer/Hiring Time already use, just with a different start event per step
// instead of always `application_date`.
export function computeTimelineAnalysis(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): TimelineAnalysis {
  const steps: TimelineStep[] = [
    {
      from: "Application",
      to: "Recruiter Contact",
      averageDays: computeAverageDaysBetweenEvents(
        apps,
        historyFacts,
        (app) => app.application_date,
        (facts) => facts.recruiterContactEnteredAt
      ),
    },
    {
      from: "Recruiter Contact",
      to: "Interview",
      averageDays: computeAverageDaysBetweenEvents(
        apps,
        historyFacts,
        (_app, facts) => facts?.recruiterContactEnteredAt ?? null,
        (facts) => facts.firstInterviewEnteredAt
      ),
    },
    {
      from: "Interview",
      to: "Offer",
      averageDays: computeAverageDaysBetweenEvents(
        apps,
        historyFacts,
        (_app, facts) => facts?.firstInterviewEnteredAt ?? null,
        (facts) => facts.offerEnteredAt
      ),
    },
    {
      from: "Offer",
      to: "Accepted",
      averageDays: computeAverageDaysBetweenEvents(
        apps,
        historyFacts,
        (_app, facts) => facts?.offerEnteredAt ?? null,
        (facts) => facts.acceptedEnteredAt
      ),
    },
  ];

  return { steps, process: computeProcessDurations(apps, historyFacts) };
}

// "Fastest process" / "Slowest process" / "Median duration": Application
// Date -> Accepted, the same full pipeline Average Hiring Time (Phase 29)
// already measures the mean of - this measures its spread instead.
function computeProcessDurations(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): ProcessDurations {
  const durations: number[] = [];

  for (const app of apps) {
    if (!app.application_date) continue;
    const acceptedAt = historyFacts.get(app.id)?.acceptedEnteredAt;
    if (!acceptedAt) continue;
    durations.push(daysBetween(app.application_date, acceptedAt));
  }

  if (durations.length === 0) {
    return { fastestDays: null, slowestDays: null, medianDays: null, sampleSize: 0 };
  }

  durations.sort((a, b) => a - b);

  return {
    fastestDays: roundTo(durations[0], 1),
    slowestDays: roundTo(durations[durations.length - 1], 1),
    medianDays: roundTo(median(durations) ?? 0, 1),
    sampleSize: durations.length,
  };
}

// ISO 8601 week key (e.g. "2026-W03") - a stable, sortable grouping key for
// "Applications per week" independent of locale week-start conventions.
function isoWeekKey(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const thursday = new Date(date.getTime());
  const dayNumber = (date.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  thursday.setUTCDate(thursday.getUTCDate() - dayNumber + 3);

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);

  const weekNumber =
    1 +
    Math.round(
      (thursday.getTime() - firstThursday.getTime()) / (7 * 86400000)
    );

  return `${thursday.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function computeApplicationsPerWeek(
  apps: AnalyticsApplicationRow[]
): WeeklyActivity[] {
  const counts = new Map<string, number>();
  for (const app of apps) {
    if (!app.application_date) continue;
    const week = isoWeekKey(app.application_date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([week, applications]) => ({ week, applications }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-RECENT_ACTIVITY_WEEKS);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "SECTION 5 Job Search Activity": streaks are counted over distinct
// calendar days with at least one application - "current" only counts if
// the most recent applied day is today or yesterday (otherwise the streak
// is broken, even though it's still the account's most recent activity).
// `today` is injectable so this stays a pure, deterministic function for
// testing, rather than reading the real clock itself.
export function computeActivityAnalysis(
  apps: AnalyticsApplicationRow[],
  monthlyAnalytics: GroupAnalyticsRow[],
  today: Date = new Date()
): ActivityAnalysis {
  const uniqueDates = [
    ...new Set(
      apps
        .map((app) => app.application_date)
        .filter((date): date is string => date !== null)
    ),
  ].sort();

  let longestStreakDays = 0;
  let currentRun = 0;
  let previousDateMs: number | null = null;

  for (const dateStr of uniqueDates) {
    const dateMs = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    currentRun =
      previousDateMs !== null && dateMs - previousDateMs === MS_PER_DAY
        ? currentRun + 1
        : 1;
    longestStreakDays = Math.max(longestStreakDays, currentRun);
    previousDateMs = dateMs;
  }

  let currentStreakDays = 0;
  if (uniqueDates.length > 0) {
    const lastDateMs = new Date(
      `${uniqueDates[uniqueDates.length - 1]}T00:00:00.000Z`
    ).getTime();
    const todayMs = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );

    if ((todayMs - lastDateMs) / MS_PER_DAY <= 1) {
      currentStreakDays = 1;
      for (let i = uniqueDates.length - 1; i > 0; i--) {
        const currentMs = new Date(`${uniqueDates[i]}T00:00:00.000Z`).getTime();
        const prevMs = new Date(
          `${uniqueDates[i - 1]}T00:00:00.000Z`
        ).getTime();
        if (currentMs - prevMs !== MS_PER_DAY) break;
        currentStreakDays += 1;
      }
    }
  }

  // Reuses the already-computed monthlyAnalytics (Phase 21's monthly_statistics
  // view, via computeGroupAnalyticsFromStatistics) rather than re-deriving
  // per-month counts - "Do not duplicate analytics calculations."
  let mostActiveMonth: MonthActivity | null = null;
  let leastActiveMonth: MonthActivity | null = null;
  for (const month of monthlyAnalytics) {
    if (!mostActiveMonth || month.applications > mostActiveMonth.applications) {
      mostActiveMonth = { month: month.id, applications: month.applications };
    }
    if (
      !leastActiveMonth ||
      month.applications < leastActiveMonth.applications
    ) {
      leastActiveMonth = { month: month.id, applications: month.applications };
    }
  }

  return {
    perWeek: computeApplicationsPerWeek(apps),
    currentStreakDays,
    longestStreakDays,
    mostActiveMonth,
    leastActiveMonth,
  };
}

// "SECTION 8 Salary": a representative value per application - the midpoint
// when both salary_min/salary_max are recorded, whichever bound is present
// otherwise. Applications with neither are excluded, never treated as zero
// ("Missing salary data must never break analytics").
//
// Known simplification: values are aggregated as plain numbers regardless
// of each application's own `currency` - there is no currency-conversion
// capability in this application (no forex API, and this phase forbids
// external APIs), so an account that records salaries in more than one
// currency will see a mixed, not-directly-comparable aggregate. Every user
// observed in this codebase's own conventions defaults to a single currency
// (DEFAULT_CURRENCY); documented here rather than silently assumed.
function applicationSalaryValue(app: AnalyticsApplicationRow): number | null {
  if (app.salary_min != null && app.salary_max != null) {
    return (app.salary_min + app.salary_max) / 2;
  }
  return app.salary_min ?? app.salary_max ?? null;
}

function salaryValues(apps: AnalyticsApplicationRow[]): number[] {
  return apps
    .map(applicationSalaryValue)
    .filter((value): value is number => value !== null);
}

export function computeSalaryStatistics(
  apps: AnalyticsApplicationRow[]
): SalaryStatistics {
  const values = salaryValues(apps).sort((a, b) => a - b);

  if (values.length === 0) {
    return { sampleSize: 0, min: null, max: null, average: null, median: null };
  }

  const sum = values.reduce((total, value) => total + value, 0);

  return {
    sampleSize: values.length,
    min: roundTo(values[0], 0),
    max: roundTo(values[values.length - 1], 0),
    average: roundTo(sum / values.length, 0),
    median: roundTo(median(values) ?? 0, 0),
  };
}

export function computeSalaryDistribution(
  apps: AnalyticsApplicationRow[]
): SalaryDistributionBucket[] {
  const values = salaryValues(apps);
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [{ rangeLabel: `${roundTo(min, 0)}`, count: values.length }];
  }

  const bucketSize = (max - min) / SALARY_DISTRIBUTION_BUCKET_COUNT;
  const buckets: SalaryDistributionBucket[] = Array.from(
    { length: SALARY_DISTRIBUTION_BUCKET_COUNT },
    (_, index) => ({
      rangeLabel: `${roundTo(min + index * bucketSize, 0)} - ${roundTo(min + (index + 1) * bucketSize, 0)}`,
      count: 0,
    })
  );

  for (const value of values) {
    const index = Math.min(
      Math.floor((value - min) / bucketSize),
      SALARY_DISTRIBUTION_BUCKET_COUNT - 1
    );
    buckets[index].count += 1;
  }

  return buckets;
}

function computeSalaryByGroup(
  apps: AnalyticsApplicationRow[],
  keyOf: (app: AnalyticsApplicationRow) => string | null,
  nameOf: (app: AnalyticsApplicationRow) => string
): SalaryByGroupRow[] {
  const groups = new Map<string, { name: string; values: number[] }>();

  for (const app of apps) {
    const value = applicationSalaryValue(app);
    if (value === null) continue;
    const key = keyOf(app);
    if (!key) continue;

    const group = groups.get(key) ?? { name: nameOf(app), values: [] };
    group.values.push(value);
    groups.set(key, group);
  }

  const rows: SalaryByGroupRow[] = [];
  for (const [id, group] of groups) {
    rows.push({
      id,
      name: group.name,
      averageSalary: roundTo(
        group.values.reduce((sum, value) => sum + value, 0) /
          group.values.length,
        0
      ),
      sampleSize: group.values.length,
    });
  }

  return rows.sort((a, b) => (b.averageSalary ?? 0) - (a.averageSalary ?? 0));
}

export function computeSalaryByCompany(
  apps: AnalyticsApplicationRow[]
): SalaryByGroupRow[] {
  return computeSalaryByGroup(
    apps,
    (app) => app.company_id,
    (app) => app.companies.name
  );
}

export function computeSalaryByWorkMode(
  apps: AnalyticsApplicationRow[]
): SalaryByGroupRow[] {
  return computeSalaryByGroup(
    apps,
    (app) => app.work_mode,
    (app) => app.work_mode ?? ""
  );
}

export function computeSalaryAnalysis(apps: AnalyticsApplicationRow[]): SalaryAnalysis {
  return {
    statistics: computeSalaryStatistics(apps),
    distribution: computeSalaryDistribution(apps),
    byCompany: computeSalaryByCompany(apps),
    byWorkMode: computeSalaryByWorkMode(apps),
  };
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// "Applications sent on Mondays perform better" - gated by the same
// MIN_SAMPLE_INTERVIEW_OFFER_RATE minimum the base page's insights already
// reuse for undocumented comparisons (e.g. "Best Application Source"), since
// ANALYTICS_ENGINE.md names no day-of-week-specific threshold either.
function computeDayOfWeekInsight(apps: AnalyticsApplicationRow[]): string | null {
  const groups = new Map<number, AnalyticsApplicationRow[]>();
  for (const app of apps) {
    if (!app.application_date) continue;
    const day = new Date(`${app.application_date}T00:00:00.000Z`).getUTCDay();
    const group = groups.get(day) ?? [];
    group.push(app);
    groups.set(day, group);
  }

  const rows = [...groups.entries()]
    .map(([day, dayApps]) => {
      const interviews = dayApps.filter((app) =>
        INTERVIEW_STAGE_STATUSES.includes(app.current_status)
      ).length;
      return {
        day,
        applications: dayApps.length,
        interviewRate: toRate(interviews, dayApps.length),
      };
    })
    .filter(
      (row) =>
        row.applications >= MIN_SAMPLE_INTERVIEW_OFFER_RATE &&
        row.interviewRate !== null
    );

  if (rows.length < 2) return null;

  const [best, second] = [...rows].sort(
    (a, b) => (b.interviewRate ?? 0) - (a.interviewRate ?? 0)
  );
  if ((best.interviewRate ?? 0) <= (second.interviewRate ?? 0)) return null;

  return `Applications sent on ${DAY_NAMES[best.day]}s tend to perform better, with a ${best.interviewRate}% interview rate.`;
}

// "You receive more interviews from hybrid positions" - reuses the
// already-computed Work Mode Analytics (computeWorkModeAnalytics), gated by
// the same minimum every other Interview Rate comparison uses.
function computeWorkModeInsight(
  workModeAnalytics: WorkModeAnalyticsRow[]
): string | null {
  const qualifying = workModeAnalytics.filter(
    (row) =>
      row.applications >= MIN_SAMPLE_INTERVIEW_OFFER_RATE &&
      row.interviewRate !== null
  );
  if (qualifying.length < 2) return null;

  const [best, second] = [...qualifying].sort(
    (a, b) => (b.interviewRate ?? 0) - (a.interviewRate ?? 0)
  );
  if ((best.interviewRate ?? 0) <= (second.interviewRate ?? 0)) return null;

  return `You receive more interviews from ${best.name} positions than ${second.name} (${best.interviewRate}% vs ${second.interviewRate}%).`;
}

// "SECTION 9 Personal Insights": deterministic sentences only, each gated by
// a documented or reused minimum sample size - "Only display insights
// backed by available data. Never fabricate conclusions." Deliberately does
// not attempt a company-size insight (e.g. "most offers come from medium-
// sized companies"): `companies.size` is free text (DATABASE.md), not a
// structured enum, and bucketing it into "small/medium/large" would mean
// inventing categorisation boundaries the data doesn't define - exactly the
// kind of fabrication this section forbids.
export function computeAdvancedInsights(
  apps: AnalyticsApplicationRow[],
  workModeAnalytics: WorkModeAnalyticsRow[]
): string[] {
  return [
    computeWorkModeInsight(workModeAnalytics),
    computeDayOfWeekInsight(apps),
  ].filter((insight): insight is string => insight !== null);
}
