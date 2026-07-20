import type {
  ApplicationSource,
  ApplicationStatus,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";

// Mirrors the enums defined in DATABASE.md "Enums" - single source for every
// Select/filter that offers these choices.
export const WORK_MODE_OPTIONS: WorkMode[] = ["Remote", "Hybrid", "On Site"];

export const EMPLOYMENT_TYPE_OPTIONS: EmploymentType[] = [
  "Full Time",
  "Part Time",
  "Internship",
  "Contract",
  "Freelance",
];

export const APPLICATION_SOURCE_OPTIONS: ApplicationSource[] = [
  "LinkedIn",
  "Indeed",
  "Referral",
  "Company Website",
  "Recruiter",
  "Other",
];

export const APPLICATION_STATUS_OPTIONS: ApplicationStatus[] = [
  "Wishlist",
  "Applied",
  "Recruiter Contact",
  "HR Interview",
  "Technical Interview",
  "Final Interview",
  "Offer",
  "Accepted",
  "Rejected",
];

// BUSINESS_RULES.md "Sorting" / API.md sortable fields, intersected: "Response
// Time" is omitted (not a stored column - see CHANGELOG "Deviations"). This
// tuple is the single source of truth - both the Zod enum (application.schema.ts)
// and the label list below are derived from it, so the literal union type
// stays intact end to end instead of widening to `string`.
export const APPLICATION_SORT_BY_VALUES = [
  "application_date",
  "company",
  "position",
  "current_status",
  "updated_at",
] as const;

export type ApplicationSortBy = (typeof APPLICATION_SORT_BY_VALUES)[number];

const APPLICATION_SORT_LABELS: Record<ApplicationSortBy, string> = {
  application_date: "Application Date",
  company: "Company",
  position: "Position",
  current_status: "Status",
  updated_at: "Last Updated",
};

export const APPLICATION_SORT_OPTIONS = APPLICATION_SORT_BY_VALUES.map(
  (value) => ({
    value,
    label: APPLICATION_SORT_LABELS[value],
  })
);

export const DEFAULT_CURRENCY = "EUR";

// BUSINESS_RULES.md "Allowed State Transitions" - the exact, immutable
// transition graph, including the "Invalid examples" section (e.g.
// Accepted -> Applied, Wishlist -> Offer) which this map implicitly rejects
// by simply never listing them. Accepted/Rejected are terminal (no outgoing
// transitions), matching the lifecycle diagram. Single source of truth,
// reused by ApplicationStatusService (enforcement) and
// ChangeApplicationStatusDialog (only offers valid next statuses).
export const APPLICATION_STATUS_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  Wishlist: ["Applied"],
  Applied: ["Recruiter Contact", "Rejected"],
  "Recruiter Contact": ["HR Interview", "Rejected"],
  "HR Interview": ["Technical Interview", "Rejected"],
  "Technical Interview": ["Final Interview", "Rejected"],
  "Final Interview": ["Offer", "Rejected"],
  Offer: ["Accepted", "Rejected"],
  Accepted: [],
  Rejected: [],
};

// BUSINESS_RULES.md "Date Handling" + DATABASE.md's
// applications_date_required_after_wishlist_check: a transition out of
// Wishlist requires application_date to already be set, or to be supplied
// as part of that transition. Single source of truth for both
// ApplicationStatusService (enforcement) and ChangeApplicationStatusDialog
// (deciding whether to show the date field) - previously hand-duplicated as
// the same condition in both places.
export function needsApplicationDateForTransition(
  currentStatus: ApplicationStatus,
  currentApplicationDate: string | null
): boolean {
  return currentStatus === "Wishlist" && !currentApplicationDate;
}

// ANALYTICS_ENGINE.md "Dashboard KPIs" - the exact stage groupings each KPI
// formula is defined against. Single source of truth for
// ApplicationStatsService; the repository's count primitive stays generic
// and has no knowledge of what these groupings mean.
export const INTERVIEW_STAGE_STATUSES: ApplicationStatus[] = [
  "HR Interview",
  "Technical Interview",
  "Final Interview",
  "Offer",
  "Accepted",
];

export const OFFER_STAGE_STATUSES: ApplicationStatus[] = ["Offer", "Accepted"];

// ANALYTICS_ENGINE.md "Response Rate": "A response is considered any status
// after Applied" - i.e. everything except these two. Used by both
// ApplicationStatsService (Dashboard/Analytics "Responded" count) and
// AnalyticsService's per-group breakdowns, so the definition is written
// once, not as a repeated inline literal.
export const UNRESPONDED_STATUSES: ApplicationStatus[] = [
  "Wishlist",
  "Applied",
];
