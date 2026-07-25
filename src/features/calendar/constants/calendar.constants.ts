import type { CalendarEventType } from "@/features/calendar/types/calendar.types";

// "EVENT TYPES": "Each event type should have: icon, color, tooltip."
// Labels/colors are presentational data, not business logic - kept here so
// every view (Month/Week/Agenda) and the Event Details panel render the
// exact same label/color for a given type, never re-worded per component.
// Icons are chosen in the component layer (lucide-react components aren't
// plain data), see CalendarEventIcon.tsx.
export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  application_submitted: "Application Submitted",
  recruiter_contact: "Recruiter Contact",
  interview: "Interview",
  technical_interview: "Technical Interview",
  final_interview: "Final Interview",
  offer_received: "Offer Received",
  offer_accepted: "Offer Accepted",
  offer_rejected: "Offer Rejected",
  rejected: "Rejected",
  reminder: "Reminder",
  custom: "Custom Event",
  goal_deadline: "Goal Deadline",
};

// Tailwind utility classes, not a new design-system token - this app has no
// existing "success"/"info" semantic color (UI_SYSTEM.md names Amber for
// warning and Green for success as a palette *family*, but no CSS variable
// was ever wired for either - see Phase 31.5's own precedent for using a
// raw Tailwind color directly rather than inventing a new global token for
// a single feature).
export const CALENDAR_EVENT_TYPE_DOT_CLASSNAMES: Record<
  CalendarEventType,
  string
> = {
  application_submitted: "bg-slate-500",
  recruiter_contact: "bg-sky-500",
  interview: "bg-blue-500",
  technical_interview: "bg-indigo-500",
  final_interview: "bg-violet-500",
  offer_received: "bg-amber-500",
  offer_accepted: "bg-emerald-500",
  offer_rejected: "bg-destructive",
  rejected: "bg-destructive",
  reminder: "bg-purple-500",
  custom: "bg-muted-foreground",
  // Overridden to emerald at render time when `goalCompleted` is true (see
  // CalendarEventIcon's `completed` prop) - this default (not yet met) uses
  // the same amber "in progress, needs attention" family Usage Indicator's
  // warning state already established (Phase 31.5).
  goal_deadline: "bg-amber-500",
};

export const CALENDAR_EVENT_TYPE_OPTIONS: CalendarEventType[] = [
  "application_submitted",
  "recruiter_contact",
  "interview",
  "technical_interview",
  "final_interview",
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "rejected",
  "reminder",
  "custom",
  "goal_deadline",
];
