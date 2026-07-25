"use client";

import { CalendarEventIcon } from "@/features/calendar/components/CalendarEventIcon";
import { groupEventsByDate } from "@/features/calendar/utils/calendar-calculations";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { EmptyState } from "@/shared/components/EmptyState";

// "CALENDAR VIEWS" - Agenda View: a flat chronological list grouped by date
// - also the mobile default ("On mobile: Agenda View becomes the default").
// `events` must already be sorted ascending by date (CalendarService already
// returns them that way - buildCalendarEvents sorts once, not re-sorted per
// view).
export function CalendarAgendaView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No events yet."
        description="Events you create, or status changes you record, will appear here."
      />
    );
  }

  const grouped = groupEventsByDate(events);

  return (
    <div className="flex flex-col gap-4">
      {[...grouped.entries()].map(([date, dayEvents]) => (
        <div key={date} className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">{date}</h4>
          <ul className="flex flex-col gap-1">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted"
                >
                  <CalendarEventIcon type={event.type} completed={event.goalCompleted} />
                  <span className="flex-1 truncate">{event.title}</span>
                  {event.companyName ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {event.companyName}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
