"use client";

import { CalendarEventIcon } from "@/features/calendar/components/CalendarEventIcon";
import type {
  CalendarDayCell,
  CalendarEvent,
} from "@/features/calendar/types/calendar.types";
import { EmptyState } from "@/shared/components/EmptyState";

// "CALENDAR VIEWS" - Week View. Same grid concept as Month View but only 7
// cells, with room to show the full event title (not truncated to a "+N
// more" overflow).
export function CalendarWeekView({
  cells,
  onEventClick,
}: {
  cells: CalendarDayCell[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const hasAnyEvent = cells.some((cell) => cell.events.length > 0);

  if (!hasAnyEvent) {
    return (
      <EmptyState
        title="No events this week."
        description="Events you create, or status changes you record, will appear here."
      />
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {cells.map((cell) => (
        <div key={cell.date} className="flex flex-col gap-2 rounded-md border p-2">
          <span className="text-xs font-medium text-muted-foreground">
            {cell.date}
          </span>
          <div className="flex flex-col gap-1">
            {cell.events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event)}
                className="flex items-center gap-1.5 rounded-sm p-1 text-left text-xs hover:bg-muted"
              >
                <CalendarEventIcon
                  type={event.type}
                  completed={event.goalCompleted}
                  className="size-3"
                />
                <span>{event.title}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
