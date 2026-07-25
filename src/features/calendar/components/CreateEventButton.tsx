"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CustomEventFormDialog } from "@/features/calendar/components/CustomEventFormDialog";
import { Button } from "@/shared/components/ui/button";

// "CREATE CUSTOM EVENT". A separate trigger from CalendarBoard's own
// edit-after-click flow (own open state), the same "create button next to
// the board, edit button inside a details panel" split every other feature
// in this codebase already uses (ApplicationCreateButton vs. editing from
// the detail page).
export function CreateEventButton({
  applicationOptions,
}: {
  applicationOptions: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Create Event
      </Button>
      <CustomEventFormDialog
        open={open}
        onOpenChange={setOpen}
        applicationOptions={applicationOptions}
      />
    </>
  );
}
