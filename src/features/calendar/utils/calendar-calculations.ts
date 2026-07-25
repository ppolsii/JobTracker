import type {
  AnalyticsApplicationRow,
  ApplicationStatusHistoryEntry,
  NoteExportRow,
} from "@/features/applications/types/application.types";
import type {
  CalendarDayCell,
  CalendarEvent,
  CalendarEventRecord,
  CalendarEventType,
  CalendarFilters,
} from "@/features/calendar/types/calendar.types";

// Pure calculation helpers for Calendar & Timeline (IMPLEMENTATION_ORDER_V2.md
// Phase 34) - no Supabase access, no I/O. CalendarService is the only
// caller. Mirrors analytics-calculations.ts's own split from its Service.

// "TIMELINE VIEW"/"EVENT TYPES": maps a real application_status_history
// transition to its calendar event type - every derived event is a real,
// already-recorded history entry, never invented. Returns null for the
// genesis row (previous_status null, new_status "Wishlist") - not one of
// the documented event types, and "Wishlist" itself isn't a job-search
// *event* the way submitting an application is.
function mapHistoryEntryToEventType(
  entry: ApplicationStatusHistoryEntry
): CalendarEventType | null {
  switch (entry.new_status) {
    case "Applied":
      return "application_submitted";
    case "Recruiter Contact":
      return "recruiter_contact";
    case "HR Interview":
      return "interview";
    case "Technical Interview":
      return "technical_interview";
    case "Final Interview":
      return "final_interview";
    case "Offer":
      return "offer_received";
    case "Accepted":
      return "offer_accepted";
    case "Rejected":
      // "Offer rejected" is the only rejection type the task names
      // explicitly. A rejection from any earlier stage is still a real,
      // important event a job-search calendar must show - hiding it would
      // contradict this phase's own objective ("visualize every important
      // event") - so it gets a distinct, generic "rejected" type instead of
      // being silently dropped.
      return entry.previous_status === "Offer" ? "offer_rejected" : "rejected";
    default:
      return null;
  }
}

// "TIMELINE VIEW": one event per real status-history transition, in
// whatever order `history` is given (ApplicationStatusService.
// listHistoryForApplications already orders by changed_at ascending -
// "Missing events should be skipped naturally" is satisfied simply by
// there being no history row for a stage the application never reached).
export function deriveStatusHistoryEvents(
  applications: AnalyticsApplicationRow[],
  history: ApplicationStatusHistoryEntry[]
): CalendarEvent[] {
  const applicationsById = new Map(applications.map((app) => [app.id, app]));
  const events: CalendarEvent[] = [];

  for (const entry of history) {
    const type = mapHistoryEntryToEventType(entry);
    if (!type) continue;

    const app = applicationsById.get(entry.application_id);
    if (!app) continue;

    events.push({
      id: entry.id,
      type,
      title: app.position,
      date: entry.changed_at.slice(0, 10),
      applicationId: app.id,
      applicationStatusHistoryId: entry.id,
      companyId: app.company_id,
      companyName: app.companies.name,
      position: app.position,
      description: null,
      workMode: app.work_mode,
      employmentType: app.employment_type,
      applicationStatus: app.current_status,
      isCustom: false,
    });
  }

  return events;
}

// "CREATE CUSTOM EVENT": maps a stored calendar_events row (reminder or
// custom) to the same unified CalendarEvent shape derived events use -
// "no provider-specific logic should exist in UI components" (Phase 32's
// principle, applied here to event sources).
export function mapCustomEventToCalendarEvent(
  row: CalendarEventRecord,
  applicationsById: Map<string, AnalyticsApplicationRow>
): CalendarEvent {
  const app = row.application_id
    ? applicationsById.get(row.application_id)
    : undefined;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    date: row.event_date,
    applicationId: row.application_id,
    applicationStatusHistoryId: null,
    companyId: app?.company_id ?? null,
    companyName: app?.companies.name ?? null,
    position: app?.position ?? null,
    description: row.description,
    workMode: app?.work_mode ?? null,
    employmentType: app?.employment_type ?? null,
    applicationStatus: app?.current_status ?? null,
    isCustom: true,
  };
}

export function buildCalendarEvents(
  applications: AnalyticsApplicationRow[],
  history: ApplicationStatusHistoryEntry[],
  customEvents: CalendarEventRecord[]
): CalendarEvent[] {
  const applicationsById = new Map(applications.map((app) => [app.id, app]));

  const derived = deriveStatusHistoryEvents(applications, history);
  const custom = customEvents.map((row) =>
    mapCustomEventToCalendarEvent(row, applicationsById)
  );

  return [...derived, ...custom].sort((a, b) => a.date.localeCompare(b.date));
}

// "CALENDAR FILTERS": every field optional and combinable.
export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: CalendarFilters
): CalendarEvent[] {
  return events.filter((event) => {
    if (filters.companyId && event.companyId !== filters.companyId) {
      return false;
    }
    if (filters.eventType && event.type !== filters.eventType) return false;
    if (
      filters.applicationStatus &&
      event.applicationStatus !== filters.applicationStatus
    ) {
      return false;
    }
    if (filters.dateFrom && event.date < filters.dateFrom) return false;
    if (filters.dateTo && event.date > filters.dateTo) return false;
    if (filters.workMode && event.workMode !== filters.workMode) return false;
    if (
      filters.employmentType &&
      event.employmentType !== filters.employmentType
    ) {
      return false;
    }
    return true;
  });
}

// "SEARCH": "Company, Position, Notes." Notes aren't part of CalendarEvent
// itself, so callers first build an index from the user's bulk notes read
// (ApplicationNoteService.listAllForUser, already established for Export)
// and pass it in here - no new notes-fetching mechanism.
export function buildApplicationNotesIndex(
  notes: NoteExportRow[]
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const note of notes) {
    const contents = index.get(note.application_id) ?? [];
    contents.push(note.content);
    index.set(note.application_id, contents);
  }
  return index;
}

export function searchCalendarEvents(
  events: CalendarEvent[],
  query: string,
  notesIndex: Map<string, string[]>
): CalendarEvent[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return events;

  return events.filter((event) => {
    if (event.companyName?.toLowerCase().includes(normalized)) return true;
    if (event.position?.toLowerCase().includes(normalized)) return true;

    const notes = event.applicationId
      ? notesIndex.get(event.applicationId)
      : undefined;
    return notes?.some((content) => content.toLowerCase().includes(normalized)) ?? false;
  });
}

export function groupEventsByDate(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = groups.get(event.date) ?? [];
    list.push(event);
    groups.set(event.date, list);
  }
  return groups;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// "CALENDAR VIEWS" - Month View: a full 6-week (42-day) grid, Monday-start,
// including leading/trailing days from the adjacent month so the grid is
// always a clean rectangle regardless of which weekday the 1st falls on.
export function buildMonthGrid(
  events: CalendarEvent[],
  year: number,
  month: number
): CalendarDayCell[] {
  const grouped = groupEventsByDate(events);
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstWeekday);

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + i);
    const dateKey = toDateKey(date);
    cells.push({
      date: dateKey,
      isCurrentPeriod: date.getUTCMonth() === month,
      events: grouped.get(dateKey) ?? [],
    });
  }
  return cells;
}

// Week View: the 7 days (Monday-start) containing `referenceDate`.
export function buildWeekGrid(
  events: CalendarEvent[],
  referenceDate: Date
): CalendarDayCell[] {
  const grouped = groupEventsByDate(events);
  const weekday = (referenceDate.getUTCDay() + 6) % 7;
  const weekStart = new Date(referenceDate);
  weekStart.setUTCDate(referenceDate.getUTCDate() - weekday);

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + i);
    const dateKey = toDateKey(date);
    cells.push({
      date: dateKey,
      isCurrentPeriod: true,
      events: grouped.get(dateKey) ?? [],
    });
  }
  return cells;
}
