"use client";

import { CalendarEventIcon } from "@/features/calendar/components/CalendarEventIcon";
import type {
  CalendarDayCell,
  CalendarEvent,
} from "@/features/calendar/types/calendar.types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_EVENTS_PER_CELL = 3;

// "CALENDAR VIEWS" - Month View (default on desktop). A plain CSS grid, not
// a chart/calendar library dependency - "reuse the existing design system."
export function CalendarMonthView({
  cells,
  onEventClick,
}: {
  cells: CalendarDayCell[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <div
            key={cell.date}
            className={cn(
              "flex min-h-24 flex-col gap-1 rounded-md border p-1",
              !cell.isCurrentPeriod && "bg-muted/30 text-muted-foreground"
            )}
          >
            <span className="text-xs">{Number(cell.date.slice(-2))}</span>
            <div className="flex flex-col gap-0.5">
              {cell.events.slice(0, MAX_EVENTS_PER_CELL).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="flex items-center gap-1 truncate rounded-sm px-1 text-left text-xs hover:bg-muted"
                >
                  <CalendarEventIcon
                    type={event.type}
                    completed={event.goalCompleted}
                    className="size-3"
                  />
                  <span className="truncate">{event.title}</span>
                </button>
              ))}
              {cell.events.length > MAX_EVENTS_PER_CELL ? (
                <span className="px-1 text-xs text-muted-foreground">
                  +{cell.events.length - MAX_EVENTS_PER_CELL} more
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
