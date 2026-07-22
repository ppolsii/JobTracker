"use client";

import { InterviewFeedbackForm } from "@/features/interview-feedback/components/InterviewFeedbackForm";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface InterviewFeedbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  applicationStatusHistoryId: string;
  feedback?: InterviewFeedback;
}

// Fully controlled, matching every other FormDialog in this codebase (see
// ApplicationNoteFormDialog) - the caller owns the open state and renders
// its own trigger.
export function InterviewFeedbackFormDialog({
  open,
  onOpenChange,
  applicationId,
  applicationStatusHistoryId,
  feedback,
}: InterviewFeedbackFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {feedback ? "Edit feedback" : "Add interview feedback"}
          </DialogTitle>
          <DialogDescription>
            {feedback
              ? "Update this feedback entry."
              : "Record structured feedback for this stage of the process."}
          </DialogDescription>
        </DialogHeader>
        <InterviewFeedbackForm
          applicationId={applicationId}
          applicationStatusHistoryId={applicationStatusHistoryId}
          feedback={feedback}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
