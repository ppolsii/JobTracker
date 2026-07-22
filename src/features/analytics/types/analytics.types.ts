import type {
  ApplicationStatus,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";

// A single percentage-style metric, paired with the sample size it was
// computed from so the UI can decide whether to show "Not enough historical
// data" (ANALYTICS_ENGINE.md "Empty State Behaviour") without re-deriving
// that decision itself - AnalyticsService (not the component) decides
// `meetsMinimum` against the documented thresholds.
export interface RateMetric {
  value: number | null;
  sampleSize: number;
  meetsMinimum: boolean;
}

export interface AnalyticsOverview {
  responseRate: RateMetric;
  interviewRate: RateMetric;
  offerRate: RateMetric;
  // IMPLEMENTATION_ORDER_V2.md Phase 29 - ANALYTICS_ENGINE.md "Acceptance
  // Rate": "Accepted Offers / Offers" - a top-level metric in its own right,
  // previously computed only internally for the CV insight's tie-break.
  acceptanceRate: RateMetric;
  // ANALYTICS_ENGINE.md "Time Metrics": "Average Offer Time"/"Average Hiring
  // Time" - "Application Date -> Offer"/"-> Accepted", across the whole
  // account (not per Company/CV/Source/Monthly grouping, which already has
  // its own Average Response Time column). No minimum sample size is
  // documented for either, so `null` simply means no application has reached
  // that stage yet - the same treatment `averageResponseTimeDays` already
  // gets on `GroupAnalyticsRow`.
  averageOfferTimeDays: number | null;
  averageHiringTimeDays: number | null;
}

// Shared row shape for Company Analytics, CV Analytics, Source Analytics,
// AND Monthly Analytics (ANALYTICS_ENGINE.md defines an identical set of
// calculated columns for all four - Applications/Responses/Interviews/
// Offers/Accepted/Rejected/rates/Average Response Time - so one type and
// one computation function serves all four groupings; Monthly's `id`/`name`
// are both the "YYYY-MM" string).
export interface GroupAnalyticsRow {
  id: string;
  name: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  accepted: number;
  rejected: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
  averageResponseTimeDays: number | null;
}

export interface FunnelStageRow {
  stage: ApplicationStatus;
  entering: number;
  progressing: number;
  rejected: number;
  conversionRate: number | null;
  dropOffRate: number | null;
}

// ANALYTICS_ENGINE.md "Work Mode Analytics": a deliberately smaller column
// set than `GroupAnalyticsRow` - only what's documented (Applications,
// Interview Rate, Offer Rate, Acceptance Rate), not the full Company/CV/
// Source/Monthly shape, since responses/rejected/average response time were
// never named for this grouping.
export interface WorkModeAnalyticsRow {
  id: WorkMode;
  name: WorkMode;
  applications: number;
  interviewRate: number | null;
  offerRate: number | null;
  acceptanceRate: number | null;
}

// ANALYTICS_ENGINE.md "Employment Type Analytics": likewise a distinct,
// smaller column set (Applications, Responses, Offers, Average Response
// Time) - no rates are documented for this grouping.
export interface EmploymentTypeAnalyticsRow {
  id: EmploymentType;
  name: EmploymentType;
  applications: number;
  responses: number;
  offers: number;
  averageResponseTimeDays: number | null;
}

// ANALYTICS_ENGINE.md "Trend Analysis": "Compare current month against
// previous month" - `null` when fewer than `MIN_SAMPLE_TREND_MONTHS` (2)
// months of data exist yet.
export interface TrendAnalysis {
  currentMonth: string;
  previousMonth: string;
  applicationGrowth: number | null;
  interviewGrowth: number | null;
  offerGrowth: number | null;
  responseGrowth: number | null;
}

export interface AnalyticsSummary {
  overview: AnalyticsOverview;
  companyAnalytics: GroupAnalyticsRow[];
  cvAnalytics: GroupAnalyticsRow[];
  sourceAnalytics: GroupAnalyticsRow[];
  monthlyAnalytics: GroupAnalyticsRow[];
  workModeAnalytics: WorkModeAnalyticsRow[];
  employmentTypeAnalytics: EmploymentTypeAnalyticsRow[];
  funnel: FunnelStageRow[];
  trend: TrendAnalysis | null;
  // Deterministic sentences only (ANALYTICS_ENGINE.md "Insights": "must
  // never speculate. Only compare measurable values") - plain strings, not
  // a richer type, since nothing beyond display renders them.
  insights: string[];
}
