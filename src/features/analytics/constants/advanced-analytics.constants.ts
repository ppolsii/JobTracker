// IMPLEMENTATION_ORDER_V2.md Phase 33 (Advanced Analytics). Presentation
// choices, not business thresholds - unlike analytics.constants.ts's
// MIN_SAMPLE_* values (which are ANALYTICS_ENGINE.md-documented minimums
// gating whether a number is shown at all), these only control how much
// data a chart renders. No new minimum-sample threshold is introduced here;
// comparisons that need one (e.g. the day-of-week insight) reuse
// MIN_SAMPLE_INTERVIEW_OFFER_RATE from analytics.constants.ts directly,
// the same way the base page's "Best Application Source" insight already
// reuses it for an undocumented comparison.

// How many of the most recent weeks the Activity section's per-week chart
// displays - an unbounded, full-history table would be unusable long-term.
export const RECENT_ACTIVITY_WEEKS = 12;

// How many buckets the Salary Distribution histogram divides the observed
// min-max range into.
export const SALARY_DISTRIBUTION_BUCKET_COUNT = 5;

// "SECTION 2 Company Performance": "top companies"/"worst companies" -
// how many rows each list shows.
export const COMPANY_RANKING_SIZE = 3;
