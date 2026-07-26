"use client";

import Link from "next/link";
import { useMemo } from "react";

import { applicationDetailRoute } from "@/config/routes";
import { ApplicationStatusTimeline } from "@/features/applications/components/ApplicationStatusTimeline";
import { isInterviewStageStatus } from "@/features/applications/constants/application.constants";
import type {
  ApplicationStatusHistoryEntry,
  NoteExportRow,
} from "@/features/applications/types/application.types";
import { CalendarEventIcon } from "@/features/calendar/components/CalendarEventIcon";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/features/calendar/constants/calendar.constants";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { InterviewFeedbackPanel } from "@/features/interview-feedback/components/InterviewFeedbackPanel";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

interface EventDetailsPanelProps {
  event: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  history: ApplicationStatusHistoryEntry[];
  notes: NoteExportRow[];
  feedback: InterviewFeedback[];
  onEdit: (event: CalendarEvent) => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// "EVENT DETAILS": "Clicking an event opens a side panel" - Sheet is this
// design system's existing side-panel primitive (already used for
// MobileSidebar), reused as-is rather than building a new overlay pattern.
// "Timeline" reuses ApplicationStatusTimeline (Phase 9) wholesale, including
// its renderFeedback slot (InterviewFeedbackPanel, Phase 30) - satisfying
// both the "Timeline" and "Interview Feedback (if any)" bullets from the
// same, already-built component ("reuse the existing Interview Feedback,
// Timeline, Status History... infrastructure whenever possible").
export function EventDetailsPanel({
  event,
  onOpenChange,
  history,
  notes,
  feedback,
  onEdit,
}: EventDetailsPanelProps) {
  const applicationHistory = useMemo(
    () =>
      event?.applicationId
        ? history
            .filter((entry) => entry.application_id === event.applicationId)
            .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
        : [],
    [history, event]
  );

  const applicationNotes = useMemo(
    () =>
      event?.applicationId
        ? notes.filter((note) => note.application_id === event.applicationId)
        : [],
    [notes, event]
  );

  // Matches ApplicationStatusTimeline's `feedbackPanels` contract (a Map of
  // pre-rendered elements, not a callback) - required for the Application
  // Detail page's Server Component usage, and applied here too so both
  // callers share one prop shape.
  //
  // BUSINESS_RULES.md "Interview Feedback": same scoping
  // InterviewFeedbackService.create enforces - isInterviewStageStatus is the
  // one predicate both layers call, not a separately re-derived check.
  // Every interview-stage row gets a panel, plus any row that already has
  // feedback from before this rule existed, so existing data is never
  // hidden.
  const feedbackPanels = useMemo(
    () =>
      new Map<string, React.ReactNode>(
        applicationHistory
          .filter((entry) => {
            const entryFeedback = feedback.filter(
              (candidate) =>
                candidate.application_status_history_id === entry.id
            );
            return (
              isInterviewStageStatus(entry.new_status) ||
              entryFeedback.length > 0
            );
          })
          .map((entry) => [
            entry.id,
            <InterviewFeedbackPanel
              key={entry.id}
              applicationId={event?.applicationId ?? ""}
              applicationStatusHistoryId={entry.id}
              feedback={feedback.filter(
                (entryFeedback) =>
                  entryFeedback.application_status_history_id === entry.id
              )}
            />,
          ])
      ),
    [applicationHistory, feedback, event?.applicationId]
  );

  return (
    <Sheet open={!!event} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-2">
            {event ? (
              <CalendarEventIcon type={event.type} completed={event.goalCompleted} />
            ) : null}
            {event ? CALENDAR_EVENT_TYPE_LABELS[event.type] : ""}
          </SheetTitle>
        </SheetHeader>

        {event ? (
          <>
            <div className="flex flex-col">
              <DetailRow label="Company" value={event.companyName} />
              <DetailRow label="Position" value={event.position} />
              <DetailRow label="Date" value={event.date} />
              <DetailRow label="Status" value={event.applicationStatus} />
              <DetailRow label="Description" value={event.description} />
            </div>

            {applicationNotes.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium">Notes</h4>
                <ul className="flex flex-col gap-2">
                  {applicationNotes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-md border bg-muted/30 p-2 text-sm whitespace-pre-wrap"
                    >
                      {note.content}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {applicationHistory.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium">Timeline</h4>
                <ApplicationStatusTimeline
                  entries={applicationHistory}
                  feedbackPanels={feedbackPanels}
                />
              </div>
            ) : null}

            <div className="mt-auto flex flex-col gap-2 border-t pt-4">
              {event.applicationId ? (
                <Button
                  type="button"
                  nativeButton={false}
                  render={
                    <Link href={applicationDetailRoute(event.applicationId)} />
                  }
                >
                  Open Application
                </Button>
              ) : null}
              {event.isCustom ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onEdit(event)}
                >
                  Edit Event
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
