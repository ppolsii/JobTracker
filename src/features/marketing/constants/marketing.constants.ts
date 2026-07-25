import { ROUTES } from "@/config/routes";

// IMPLEMENTATION_ORDER_V2.md Phase 37 (Landing Page & Marketing Website).
// Every marketing page reads its content from here rather than hardcoding
// copy inline - the same "one source of truth for presentational data"
// convention CALENDAR_EVENT_TYPE_LABELS/ACHIEVEMENT_DEFINITIONS already
// established.

export const MARKETING_NAV_LINKS = [
  { label: "Features", href: ROUTES.FEATURES },
  { label: "Pricing", href: ROUTES.PLANS },
  { label: "About", href: ROUTES.ABOUT },
  { label: "Contact", href: ROUTES.CONTACT },
] as const;

export const MARKETING_FOOTER_LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: ROUTES.FEATURES },
      { label: "Pricing", href: ROUTES.PLANS },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: ROUTES.ABOUT },
      { label: "Contact", href: ROUTES.CONTACT },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: ROUTES.PRIVACY },
      { label: "Terms of Service", href: ROUTES.TERMS },
    ],
  },
] as const;

// "FEATURES": one entry per feature this task explicitly lists, each keyed
// by a stable string (icon choice lives in FeatureIcon.tsx, mirroring the
// CalendarEventIcon/AchievementIcon/NotificationIcon precedent of keeping
// icon-only logic in the component layer, not in data). Every description
// is grounded in a feature this application actually ships (no aspirational
// or fabricated claims) - Goals/Achievements/Notifications are explicitly
// described as Pro features, matching billing.constants.ts's own
// PLAN_FEATURE_ROWS.
export interface FeatureHighlight {
  key: string;
  title: string;
  description: string;
  pro?: boolean;
}

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    key: "application-tracking",
    title: "Application Tracking",
    description:
      "Log every application with company, position, source, salary, and status - and follow it from Wishlist through to Offer.",
  },
  {
    key: "companies",
    title: "Companies",
    description:
      "Keep a running record of every company you engage with, and see every application tied back to it.",
  },
  {
    key: "cv-management",
    title: "CV Management",
    description:
      "Track multiple CV versions and compare which one actually gets you more interviews.",
  },
  {
    key: "timeline",
    title: "Timeline",
    description:
      "A visual, chronological history of every status change for an application, from Applied to Accepted or Rejected.",
  },
  {
    key: "interview-feedback",
    title: "Interview Feedback",
    description:
      "Capture structured notes and a rating right after each interview stage, while it's still fresh.",
  },
  {
    key: "smart-job-import",
    title: "Smart Job Import",
    description:
      "Paste a job posting URL and land straight in a pre-filled, editable application form.",
    pro: true,
  },
  {
    key: "advanced-analytics",
    title: "Advanced Analytics",
    description:
      "A deeper, filterable dashboard: company and CV ranking, timeline analysis, activity streaks, and salary insights.",
    pro: true,
  },
  {
    key: "calendar",
    title: "Calendar",
    description:
      "Every interview, offer, and reminder in one Month/Week/Agenda view, alongside custom events you add yourself.",
    pro: true,
  },
  {
    key: "goals",
    title: "Goals",
    description:
      "Set application, interview, offer, or recruiter-contact targets and track your progress automatically.",
    pro: true,
  },
  {
    key: "achievements",
    title: "Achievements",
    description:
      "Unlock milestones automatically as you stay consistent - from your first application to a 30-day streak.",
    pro: true,
  },
  {
    key: "notifications",
    title: "Notifications",
    description:
      "A centralized Notification Center that proactively flags stale applications, upcoming interviews, and goal progress.",
    pro: true,
  },
];

// "FAQ": every answer states a real, existing rule (BUSINESS_RULES.md's
// application limit/Export/plan scope) - none of these are invented.
export const FAQ_ITEMS = [
  {
    question: "Is JobTracker Insights free to use?",
    answer:
      "Yes. The Free plan includes application tracking, companies, CV management, status history, notes, interview feedback, search, and core analytics - up to 15 active applications at a time.",
  },
  {
    question: "What does the Pro plan add?",
    answer:
      "Pro removes the active-application limit and adds Export, Smart Job Import, Advanced Analytics, Calendar, Goals & Achievements, and the Notification Center.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes - there's no lock-in. You can manage your subscription at any time from Settings once you're signed in.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your data belongs to you. It's never sold or shared, and you can export everything you've entered at any time on the Pro plan. See our Privacy Policy for details.",
  },
  {
    question: "Do I need a credit card to sign up?",
    answer:
      "No. You can create a Free account and start tracking applications immediately, with no payment details required.",
  },
] as const;

// "Testimonials placeholder": deliberately generic, role-based attribution -
// no fabricated names, companies, or photos presented as real endorsements.
// Meant to be replaced with genuine testimonials once collected.
export const TESTIMONIAL_PLACEHOLDERS = [
  {
    quote:
      "Placeholder testimonial - swap in a real quote once you've collected one from an actual user.",
    role: "Job Seeker",
  },
  {
    quote:
      "Placeholder testimonial - swap in a real quote once you've collected one from an actual user.",
    role: "Career Changer",
  },
  {
    quote:
      "Placeholder testimonial - swap in a real quote once you've collected one from an actual user.",
    role: "New Graduate",
  },
] as const;
