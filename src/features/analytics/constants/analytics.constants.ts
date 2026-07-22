import type { ApplicationStatus } from "@/features/applications/types/application.types";

// ANALYTICS_ENGINE.md "Funnel Analytics": the 7 stages, in order. Distinct
// from APPLICATION_STATUS_TRANSITIONS (which also has Wishlist and Rejected
// as graph nodes) - the funnel itself starts at Applied and ends at
// Accepted; Rejected is an exit from a stage, not a stage itself.
export const FUNNEL_STAGES: ApplicationStatus[] = [
  "Applied",
  "Recruiter Contact",
  "HR Interview",
  "Technical Interview",
  "Final Interview",
  "Offer",
  "Accepted",
];

// ANALYTICS_ENGINE.md "Minimum Data Requirements" - the exact, documented
// thresholds. No threshold is invented for anything not listed here
// (e.g. Response Rate, Source comparisons have no documented minimum of
// their own - see AnalyticsService for how each is actually applied).
export const MIN_SAMPLE_INTERVIEW_OFFER_RATE = 5;
export const MIN_SAMPLE_CV_COMPARISON = 10;
export const MIN_SAMPLE_COMPANY_COMPARISON = 3;

// IMPLEMENTATION_ORDER_V2.md Phase 29 - ANALYTICS_ENGINE.md "Minimum Data
// Requirements": "Trend Analysis: Minimum: 2 months."
export const MIN_SAMPLE_TREND_MONTHS = 2;

// ANALYTICS_ENGINE.md "Empty State Behaviour": "Do not estimate. Display:
// 'Not enough historical data.'"
export const INSUFFICIENT_DATA_MESSAGE = "Not enough historical data.";
