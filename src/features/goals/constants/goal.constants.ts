import type {
  AchievementDefinition,
  GoalMetric,
  GoalPeriod,
  GoalStatus,
} from "@/features/goals/types/goal.types";

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  applications: "Applications",
  interviews: "Interviews",
  offers: "Offers",
  recruiter_contacts: "Recruiter Contacts",
};

export const GOAL_METRIC_OPTIONS: GoalMetric[] = [
  "applications",
  "interviews",
  "offers",
  "recruiter_contacts",
];

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  total: "Total",
};

export const GOAL_PERIOD_OPTIONS: GoalPeriod[] = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "total",
];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

// "STREAKS": no numeric spec was given for "Consistent Week" or the count-
// based achievements below beyond the four explicit application milestones
// (1/10/50/100) and "30-Day Streak" - every other threshold here is a
// documented, deliberate choice (mirrors Advanced Analytics' own precedent
// of naming an undocumented sample-size threshold rather than leaving it
// implicit), not a fabricated business rule.
export const APPLICATION_MILESTONES = [1, 10, 50, 100] as const;
export const INTERVIEW_MASTER_THRESHOLD = 10;
export const OFFER_HUNTER_THRESHOLD = 3;
// Distinct applications-in-a-single-ISO-week count for "Consistent Week" -
// deliberately smaller than a full 7-day daily streak (that's what
// "30-Day Streak" already measures), so the two achievements reward two
// different habits (steady daily logging vs. a genuinely productive week).
export const CONSISTENT_WEEK_APPLICATION_THRESHOLD = 5;
export const LONG_STREAK_DAYS_THRESHOLD = 30;

// "ACHIEVEMENTS": the catalog. Purely descriptive data - evaluation logic
// (which of these a user has actually earned) lives in
// achievement-calculations.ts, keyed by these same `key` values. Unlock
// state itself (user_achievements) is the only thing ever persisted; this
// list can gain new entries in future phases without a migration.
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: "first_application",
    label: "First Application",
    description: "Submit your first application.",
  },
  {
    key: "applications_10",
    label: "10 Applications",
    description: "Submit 10 applications.",
  },
  {
    key: "applications_50",
    label: "50 Applications",
    description: "Submit 50 applications.",
  },
  {
    key: "applications_100",
    label: "100 Applications",
    description: "Submit 100 applications.",
  },
  {
    key: "first_interview",
    label: "First Interview",
    description: "Reach an interview stage for the first time.",
  },
  {
    key: "first_offer",
    label: "First Offer",
    description: "Receive your first offer.",
  },
  {
    key: "first_accepted_offer",
    label: "First Accepted Offer",
    description: "Accept your first offer.",
  },
  {
    key: "interview_master",
    label: "Interview Master",
    description: `Reach an interview stage in ${INTERVIEW_MASTER_THRESHOLD} applications.`,
  },
  {
    key: "offer_hunter",
    label: "Offer Hunter",
    description: `Receive ${OFFER_HUNTER_THRESHOLD} offers.`,
  },
  {
    key: "consistent_week",
    label: "Consistent Week",
    description: `Submit ${CONSISTENT_WEEK_APPLICATION_THRESHOLD} applications within a single week.`,
  },
  {
    key: "streak_30_days",
    label: "30-Day Streak",
    description: "Apply on 30 consecutive days.",
  },
];
