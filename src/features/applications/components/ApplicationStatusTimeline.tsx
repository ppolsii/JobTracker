"use client";

import type { ApplicationStatusHistoryEntry } from "@/features/applications/types/application.types";
import { formatDateTime } from "@/lib/utils";

// "use client": formatDateTime depends on the visitor's browser timezone
// (BUSINESS_RULES.md "Time"), which a Server Component cannot know.
export function ApplicationStatusTimeline({
  entries,
  renderFeedback,
}: {
  entries: ApplicationStatusHistoryEntry[];
  // IMPLEMENTATION_ORDER_V2.md Phase 30: "a feedback panel attached to each
  // Status History row." A slot the caller fills in per entry, the same
  // prop-injection pattern TopNav uses for `search`/`exportMenu` - this keeps
  // the Applications feature from importing Interview Feedback directly.
  renderFeedback: (historyId: string) => React.ReactNode;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status history yet.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">
                {entry.previous_status
                  ? `${entry.previous_status} → ${entry.new_status}`
                  : `Created (${entry.new_status})`}
              </p>
              <time
                dateTime={entry.changed_at}
                suppressHydrationWarning
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(entry.changed_at)}
              </time>
            </div>
            {renderFeedback(entry.id)}
          </div>
        </li>
      ))}
    </ol>
  );
}
