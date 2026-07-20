import type { ApplicationStatus } from "@/features/applications/types/application.types";

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

export interface AnalyticsSummary {
  overview: AnalyticsOverview;
  companyAnalytics: GroupAnalyticsRow[];
  cvAnalytics: GroupAnalyticsRow[];
  sourceAnalytics: GroupAnalyticsRow[];
  monthlyAnalytics: GroupAnalyticsRow[];
  funnel: FunnelStageRow[];
  // Deterministic sentences only (ANALYTICS_ENGINE.md "Insights": "must
  // never speculate. Only compare measurable values") - plain strings, not
  // a richer type, since nothing beyond display renders them.
  insights: string[];
}
