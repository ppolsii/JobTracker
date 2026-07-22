"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveInterviewFeedbackAction } from "@/features/interview-feedback/actions/interview-feedback.actions";
import { InterviewFeedbackFormDialog } from "@/features/interview-feedback/components/InterviewFeedbackFormDialog";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";

// IMPLEMENTATION_ORDER_V2.md Phase 30: "a feedback panel attached to each
// Status History row" - rendered per entry by ApplicationStatusTimeline.
// Append-only like ApplicationNotesList (any number of feedback entries may
// exist per stage), so this renders a list, not a single slot.
export function InterviewFeedbackPanel({
  applicationId,
  applicationStatusHistoryId,
  feedback,
}: {
  applicationId: string;
  applicationStatusHistoryId: string;
  feedback: InterviewFeedback[];
}) {
  const [creating, setCreating] = useState(false);
  const [editingFeedback, setEditingFeedback] =
    useState<InterviewFeedback | null>(null);
  const [archivingFeedback, setArchivingFeedback] =
    useState<InterviewFeedback | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchiveConfirm() {
    if (!archivingFeedback) return;
    const target = archivingFeedback;

    startTransition(async () => {
      const result = await archiveInterviewFeedbackAction({
        id: target.id,
        application_id: applicationId,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Feedback archived.");
      setArchivingFeedback(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {feedback.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 p-2"
        >
          <div className="flex flex-col gap-0.5 text-xs">
            {entry.rating || entry.format ? (
              <p className="font-medium">
                {[
                  entry.rating ? `${entry.rating}/5` : null,
                  entry.format ?? null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-muted-foreground">
              {entry.notes}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit feedback"
              onClick={() => setEditingFeedback(entry)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Archive feedback"
              onClick={() => setArchivingFeedback(entry)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setCreating(true)}
      >
        <Plus className="size-3.5" />
        Add feedback
      </Button>

      <InterviewFeedbackFormDialog
        open={creating}
        onOpenChange={setCreating}
        applicationId={applicationId}
        applicationStatusHistoryId={applicationStatusHistoryId}
      />
      <InterviewFeedbackFormDialog
        open={!!editingFeedback}
        onOpenChange={(open) => !open && setEditingFeedback(null)}
        applicationId={applicationId}
        applicationStatusHistoryId={applicationStatusHistoryId}
        feedback={editingFeedback ?? undefined}
      />
      <ConfirmDialog
        open={!!archivingFeedback}
        onOpenChange={(open) => !open && setArchivingFeedback(null)}
        title="Archive this feedback?"
        description="Archived feedback is hidden but preserved."
        confirmLabel="Archive"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleArchiveConfirm}
      />
    </div>
  );
}
