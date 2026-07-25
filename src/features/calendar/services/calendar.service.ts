import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import type {
  ApplicationStatusHistoryEntry,
  NoteExportRow,
} from "@/features/applications/types/application.types";
import { BillingService } from "@/features/billing/services/billing.service";
import { CalendarEventRepository } from "@/features/calendar/repositories/calendar-event.repository";
import type {
  CalendarEvent,
  CalendarEventRecord,
  CalendarFilters,
} from "@/features/calendar/types/calendar.types";
import type { Database } from "@/types/supabase";
import {
  buildApplicationNotesIndex,
  buildCalendarEvents,
  filterCalendarEvents,
  searchCalendarEvents,
} from "@/features/calendar/utils/calendar-calculations";
import { GoalService } from "@/features/goals/services/goal.service";
import { buildGoalDeadlineEvents } from "@/features/goals/utils/goal-calculations";
import { InterviewFeedbackService } from "@/features/interview-feedback/services/interview-feedback.service";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

interface CustomEventInput {
  type: Database["public"]["Enums"]["calendar_event_type"];
  title: string;
  description?: string;
  eventDate: string;
  applicationId?: string;
}

// Everything the Calendar page and its Event Details panel need, fetched
// once ("PERFORMANCE": "avoid unnecessary queries") - `history`/`notes`/
// `feedback` are the full, flat, already-loaded bulk reads (not Maps, so
// this stays JSON-serializable across the Server Component -> Client
// Component boundary); the panel groups/looks up from them client-side
// (in-memory, no extra request) when a specific event is opened.
export interface CalendarPageData {
  events: CalendarEvent[];
  history: ApplicationStatusHistoryEntry[];
  notes: NoteExportRow[];
  feedback: InterviewFeedback[];
}

// IMPLEMENTATION_ORDER_V2.md Phase 34 (Calendar & Timeline). Owns the whole
// Calendar workflow - Pro-gating, bulk fetching, deriving/merging/filtering/
// searching events, and custom-event CRUD - Repositories stay data-access
// only. Reuses every existing bulk-read method already established
// elsewhere (Analytics' Phase 12/29/33 projection, Export's Phase 14 notes
// read, Phase 30's feedback infrastructure) rather than adding new queries -
// "avoid unnecessary queries."
export const CalendarService = {
  // "CALENDAR PAGE"/"CALENDAR FILTERS"/"SEARCH". `search` is applied after
  // `filters`, matching the natural "narrow down, then search within that"
  // reading of the page (both are combinable since search never widens what
  // filters already excluded).
  async getEvents(
    userId: string,
    filters: CalendarFilters,
    search?: string
  ): Promise<ActionResult<CalendarPageData>> {
    // "PRO ACCESS": reuses BillingService.requireProPlan - the same check
    // Export/Smart Job Import/Advanced Analytics already use ("do not
    // create a new Pro gating system").
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const [
      applicationsResult,
      customEventsResult,
      notesResult,
      feedbackResult,
      goalsResult,
    ] = await Promise.all([
      ApplicationService.listAllForAnalytics(userId),
      CalendarEventRepository.listAllForUser(userId),
      ApplicationNoteService.listAllForUser(userId),
      InterviewFeedbackService.listAllForUser(userId),
      // "CALENDAR INTEGRATION": no re-gate here - this Pro check above
      // already covers the entire read, the same "single Pro-gated entry
      // point" discipline notesResult/feedbackResult above already follow.
      GoalService.listGoalsWithProgressForCalendar(userId),
    ]);

    if (!applicationsResult.success) return applicationsResult;
    if (customEventsResult.error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading your calendar.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
    if (!notesResult.success) return notesResult;
    if (!feedbackResult.success) return feedbackResult;
    if (!goalsResult.success) return goalsResult;

    const applications = applicationsResult.data;

    const historyResult = await ApplicationStatusService.listHistoryForApplications(
      applications.map((app) => app.id)
    );
    if (!historyResult.success) return historyResult;

    const events = [
      ...buildCalendarEvents(
        applications,
        historyResult.data,
        (customEventsResult.data ?? []) as CalendarEventRecord[]
      ),
      ...buildGoalDeadlineEvents(goalsResult.data),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const filtered = filterCalendarEvents(events, filters);
    const searched = search?.trim()
      ? searchCalendarEvents(
          filtered,
          search,
          buildApplicationNotesIndex(notesResult.data)
        )
      : filtered;

    return {
      success: true,
      data: {
        events: searched,
        history: historyResult.data,
        notes: notesResult.data,
        feedback: feedbackResult.data,
      },
    };
  },

  // "CREATE CUSTOM EVENT". `applicationId`, when given, must belong to an
  // application owned by this user - verified by going through
  // ApplicationService.getById (the same cross-feature-Service, never-its-
  // Repository discipline every other feature in this codebase already
  // follows), independent of RLS's own identical check on the same column.
  async createCustomEvent(
    userId: string,
    input: CustomEventInput
  ): Promise<ActionResult<CalendarEventRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    if (input.applicationId) {
      const application = await ApplicationService.getById(
        userId,
        input.applicationId
      );
      if (!application.success) return application;
    }

    const { data, error } = await CalendarEventRepository.create({
      user_id: userId,
      application_id: input.applicationId ?? null,
      type: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: input.eventDate,
    });

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while creating the event.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  // Ownership is enforced by CalendarEventRepository.update filtering on
  // user_id directly - no separate resolve-then-check step is needed here
  // (calendar_events has its own user_id column, unlike application_notes).
  async updateCustomEvent(
    userId: string,
    id: string,
    input: CustomEventInput
  ): Promise<ActionResult<CalendarEventRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    if (input.applicationId) {
      const application = await ApplicationService.getById(
        userId,
        input.applicationId
      );
      if (!application.success) return application;
    }

    const { data, error } = await CalendarEventRepository.update(userId, id, {
      application_id: input.applicationId ?? null,
      type: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: input.eventDate,
    });

    if (error || !data) {
      return {
        success: false,
        error: { message: "Event not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    return { success: true, data };
  },

  // BUSINESS_RULES.md "Soft Deletes": archiving sets deleted_at; no hard
  // DELETE (calendar_events has no DELETE grant/RLS policy at all, matching
  // every other business entity in this project).
  async archiveCustomEvent(
    userId: string,
    id: string
  ): Promise<ActionResult<CalendarEventRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { data, error } = await CalendarEventRepository.archive(userId, id);

    if (error || !data) {
      return {
        success: false,
        error: { message: "Event not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    console.info(`Calendar event ${id} archived by user ${userId}.`);
    return { success: true, data };
  },
};
