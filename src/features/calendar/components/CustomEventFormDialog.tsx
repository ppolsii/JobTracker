"use client";

import { CustomEventForm } from "@/features/calendar/components/CustomEventForm";
import type { EditableCalendarEvent } from "@/features/calendar/types/calendar.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface CustomEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationOptions: { id: string; label: string }[];
  event?: EditableCalendarEvent;
}

// Fully controlled, matching every other FormDialog in this codebase (see
// ApplicationNoteFormDialog).
export function CustomEventFormDialog({
  open,
  onOpenChange,
  applicationOptions,
  event,
}: CustomEventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Create event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update this event."
              : "Add a reminder or a custom event to your calendar."}
          </DialogDescription>
        </DialogHeader>
        <CustomEventForm
          event={event}
          applicationOptions={applicationOptions}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
