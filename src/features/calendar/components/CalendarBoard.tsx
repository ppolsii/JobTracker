"use client";

import { useMemo, useState } from "react";

import type {
  ApplicationStatusHistoryEntry,
  NoteExportRow,
} from "@/features/applications/types/application.types";
import { CalendarAgendaView } from "@/features/calendar/components/CalendarAgendaView";
import { CalendarMonthView } from "@/features/calendar/components/CalendarMonthView";
import { CalendarWeekView } from "@/features/calendar/components/CalendarWeekView";
import { CustomEventFormDialog } from "@/features/calendar/components/CustomEventFormDialog";
import { EventDetailsPanel } from "@/features/calendar/components/EventDetailsPanel";
import type {
  CalendarEvent,
  CalendarView,
  EditableCalendarEvent,
} from "@/features/calendar/types/calendar.types";
import {
  buildMonthGrid,
  buildWeekGrid,
} from "@/features/calendar/utils/calendar-calculations";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";

interface CalendarBoardProps {
  events: CalendarEvent[];
  history: ApplicationStatusHistoryEntry[];
  notes: NoteExportRow[];
  feedback: InterviewFeedback[];
  view: CalendarView | null;
  applicationOptions: { id: string; label: string }[];
}

// "CALENDAR VIEWS": composes whichever view is active (URL-driven, see
// CalendarViewSwitcher) around the same shared event list, plus the Event
// Details panel and the create/edit dialog. "On mobile: Agenda View becomes
// the default" is handled with plain responsive classes (`hidden sm:block`/
// `block sm:hidden`) when no explicit `view` was chosen - no device
// detection needed, matching how this design system already handles
// Sidebar vs. MobileSidebar.
export function CalendarBoard({
  events,
  history,
  notes,
  feedback,
  view,
  applicationOptions,
}: CalendarBoardProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditableCalendarEvent | undefined>(
    undefined
  );
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const monthCells = useMemo(
    () => buildMonthGrid(events, today.getUTCFullYear(), today.getUTCMonth()),
    [events, today]
  );
  const weekCells = useMemo(() => buildWeekGrid(events, today), [events, today]);

  function handleEdit(event: CalendarEvent) {
    setEditingEvent({
      id: event.id,
      type: event.type === "reminder" ? "reminder" : "custom",
      title: event.title,
      description: event.description,
      event_date: event.date,
      application_id: event.applicationId,
    });
    setSelectedEvent(null);
    setFormDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {view === "month" || view === null ? (
        <div className={view === null ? "hidden sm:block" : undefined}>
          <CalendarMonthView cells={monthCells} onEventClick={setSelectedEvent} />
        </div>
      ) : null}

      {view === "week" ? (
        <CalendarWeekView cells={weekCells} onEventClick={setSelectedEvent} />
      ) : null}

      {view === "agenda" || view === null ? (
        <div className={view === null ? "block sm:hidden" : undefined}>
          <CalendarAgendaView events={events} onEventClick={setSelectedEvent} />
        </div>
      ) : null}

      <EventDetailsPanel
        event={selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        history={history}
        notes={notes}
        feedback={feedback}
        onEdit={handleEdit}
      />

      <CustomEventFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditingEvent(undefined);
        }}
        applicationOptions={applicationOptions}
        event={editingEvent}
      />
    </div>
  );
}
