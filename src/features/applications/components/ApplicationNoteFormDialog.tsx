"use client";

import { ApplicationNoteForm } from "@/features/applications/components/ApplicationNoteForm";
import type { ApplicationNote } from "@/features/applications/types/application.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface ApplicationNoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  note?: ApplicationNote;
}

// Fully controlled, matching every other FormDialog in this codebase - the
// caller owns the open state and renders its own trigger.
export function ApplicationNoteFormDialog({
  open,
  onOpenChange,
  applicationId,
  note,
}: ApplicationNoteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? "Edit note" : "Add note"}</DialogTitle>
          <DialogDescription>
            {note
              ? "Update this note."
              : "Add a note to this application. Markdown is supported."}
          </DialogDescription>
        </DialogHeader>
        <ApplicationNoteForm
          applicationId={applicationId}
          note={note}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
