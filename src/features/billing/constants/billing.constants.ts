// BUSINESS_RULES.md "Billing": Free plan is limited to this many active
// (non-archived) applications; Pro is unlimited. Single source of truth -
// BillingService is the only place this constant is read.
// Reduced from 25 to 15 (Phase 31 - Pro Plan Foundation).
export const FREE_PLAN_APPLICATION_LIMIT = 15;

// Phase 31.5 (Pro Plan Foundation) - display-only threshold for the Usage
// Indicator's "approaching the limit" warning. Not an entitlement decision
// (nothing is denied at this ratio) - purely a UI nudge, so it lives beside
// the display components rather than inside BillingService.
export const USAGE_WARNING_RATIO = 0.8;

// Phase 31.5 - the Pricing page's feature comparison table. Every row here
// is presentational copy, not a new entitlement: rows already enforced
// elsewhere (the application limit, Export) mirror the real, existing rule;
// rows marked `comingSoon` describe roadmap items explicitly excluded from
// this phase's scope (per FEATURES.md "Future Features") and are never
// gated in code - they exist only so the Pricing page can be honest about
// what Pro currently includes versus what's planned.
export interface PlanFeatureRow {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  comingSoon?: boolean;
}

export const PLAN_FEATURE_ROWS: PlanFeatureRow[] = [
  {
    label: "Active applications",
    free: `Up to ${FREE_PLAN_APPLICATION_LIMIT}`,
    pro: "Unlimited",
  },
  { label: "Companies", free: true, pro: true },
  { label: "CV management", free: true, pro: true },
  { label: "Status history & timeline", free: true, pro: true },
  { label: "Notes", free: true, pro: true },
  { label: "Interview Feedback", free: true, pro: true },
  { label: "Search", free: true, pro: true },
  { label: "Analytics", free: "Basic", pro: true },
  { label: "Export data (CSV/JSON)", free: false, pro: true },
  // Phase 32: implemented (Manual Provider) - no longer "Coming Soon".
  { label: "Smart Job Import", free: false, pro: true },
  // Phase 33: implemented - no longer "Coming Soon".
  { label: "Advanced Analytics", free: false, pro: true },
  // Phase 34: implemented (Month/Week/Agenda views, custom events) - no
  // longer "Coming Soon". Phase 34 itself only built a "Reminder"
  // calendar-event *type*, not proactive notification/alert delivery -
  // Phase 36's Notification Center is what actually delivers that, so
  // "Reminders" below is flipped there instead, not here.
  { label: "Calendar", free: false, pro: true },
  // Phase 35: implemented (goals, streaks, achievements) - no longer
  // "Coming Soon".
  { label: "Goals", free: false, pro: true },
  // Phase 36: the Notification Center's Smart Reminders are what
  // "Reminders" always meant here - no longer "Coming Soon". A new,
  // separate "Notification Center" row names the feature itself.
  { label: "Reminders", free: false, pro: true },
  { label: "Notification Center", free: false, pro: true },
];

// Shared by every upgrade-prompting surface (Pricing page, Upgrade dialog,
// Limit Reached dialog, Subscription section) so the "why go Pro" pitch is
// written once, not re-worded at each call site.
export const PRO_BENEFITS: string[] = [
  "Unlimited active applications - never archive early just to make room.",
  "Export your data to CSV or JSON at any time.",
  "Smart Job Import - create an application by pasting a job URL.",
  "Advanced Analytics - funnel conversion, company/CV ranking, timeline, salary insights, and more.",
  "Calendar - visualize every interview, offer, and reminder across Month/Week/Agenda views.",
  "Goals & Achievements - set application/interview/offer targets, track streaks, and unlock achievements.",
  "Notification Center - smart reminders about stale applications, interviews, goals, and achievements, all in one place.",
];
