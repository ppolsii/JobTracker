import type { Database } from "@/types/supabase";
import type {
  ApplicationStatus,
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";

export type CalendarEventRecord =
  Database["public"]["Tables"]["calendar_events"]["Row"];

// IMPLEMENTATION_ORDER_V2.md Phase 34 (Calendar & Timeline) "EVENT TYPES".
// The 8 status-derived types map 1:1 to a real application_status_history
// transition (see calendar-calculations.ts's deriveStatusHistoryEvents) -
// nothing here is stored, only "reminder"/"custom" persist as rows in
// calendar_events. `rejected` is not in the task's literal list (only
// "Offer rejected" is) - added so a rejection from any earlier stage still
// appears on a calendar whose whole purpose is "visualize every important
// event," rather than silently hiding real history data.
// `goal_deadline` (Phase 35 - Goals, Achievements & Progress) is likewise
// never stored - CalendarService derives one per active, recurring goal at
// its current period's end date (see goals/utils/goal-calculations.ts's
// buildGoalDeadlineEvents).
export type CalendarEventType =
  | "application_submitted"
  | "recruiter_contact"
  | "interview"
  | "technical_interview"
  | "final_interview"
  | "offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "rejected"
  | "reminder"
  | "custom"
  | "goal_deadline";

// The single, unified shape every calendar view/filter/search operates on,
// regardless of whether the event was derived from status history or
// stored as a custom event/reminder - "no provider-specific [type-specific]
// logic should exist in UI components" (mirrors Phase 32's provider
// abstraction principle, applied to event sources instead of providers).
export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;
  applicationId: string | null;
  // Only set for status-derived events - lets the Event Details panel look
  // up Interview Feedback attached to this specific stage (Phase 30).
  applicationStatusHistoryId: string | null;
  companyId: string | null;
  companyName: string | null;
  position: string | null;
  description: string | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  applicationStatus: ApplicationStatus | null;
  // true for reminder/custom (user-created, editable/deletable); false for
  // every status-derived event (immutable history, matching Status
  // History's own "append only" rule - a calendar event derived from it
  // must never appear editable).
  isCustom: boolean;
  // Phase 35 "CALENDAR INTEGRATION": "Completed goals should appear
  // visually." Only ever set (true/false) on `goal_deadline` events -
  // undefined for every other type, which have no such concept.
  goalCompleted?: boolean;
}

// "CALENDAR FILTERS". Every field optional and combinable, mirroring
// AdvancedAnalyticsFilters' own shape (Phase 33).
export interface CalendarFilters {
  companyId?: string;
  eventType?: CalendarEventType;
  applicationStatus?: ApplicationStatus;
  dateFrom?: string;
  dateTo?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
}

export type CalendarView = "month" | "week" | "agenda";

// The subset of a stored calendar_events row CustomEventForm actually
// reads/edits - narrower than the full CalendarEventRecord (no user_id/
// created_at/updated_at/deleted_at), so building one from an in-memory
// CalendarEvent (e.g. when opening the edit form from Event Details) never
// needs placeholder values for fields the form doesn't use.
export type EditableCalendarEvent = Pick<
  CalendarEventRecord,
  "id" | "type" | "title" | "description" | "event_date" | "application_id"
>;

export interface CalendarDayCell {
  date: string;
  isCurrentPeriod: boolean;
  events: CalendarEvent[];
}
