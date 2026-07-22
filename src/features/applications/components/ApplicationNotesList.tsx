"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { archiveApplicationNoteAction } from "@/features/applications/actions/application-note.actions";
import { ApplicationNoteFormDialog } from "@/features/applications/components/ApplicationNoteFormDialog";
import type { ApplicationNote } from "@/features/applications/types/application.types";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/lib/utils";

// Not built on the shared DataTable: notes are variable-height freeform text
// blocks, not tabular rows, and FEATURES.md's "Unlimited notes" has no
// documented pagination requirement to justify one - a plain list matches
// the content better than forcing it into a column/row model.
export function ApplicationNotesList({
  notes,
  applicationId,
}: {
  notes: ApplicationNote[];
  applicationId: string;
}) {
  const [editingNote, setEditingNote] = useState<ApplicationNote | null>(null);
  const [archivingNote, setArchivingNote] = useState<ApplicationNote | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function handleArchiveConfirm() {
    if (!archivingNote) return;
    const target = archivingNote;

    startTransition(async () => {
      const result = await archiveApplicationNoteAction({ id: target.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Note archived.");
      setArchivingNote(null);
    });
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        title="No notes yet"
        description="Add a note to keep track of important details for this application."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            {/* IMPLEMENTATION_ORDER_V2.md Phase 28: BUSINESS_RULES.md "Notes"
                says Markdown is supported - content was stored correctly all
                along but only ever displayed as plain text. ReactMarkdown
                renders straight to React elements (no dangerouslySetInnerHTML),
                and does not render embedded raw HTML by default, matching
                "Rich text is not" supported. Utility classes cover only what
                Tailwind's Preflight reset otherwise strips from the elements
                Markdown can produce (list markers/indentation, paragraph
                spacing, link styling) - no typography plugin needed for this. */}
            <div className="text-sm [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-2 [&_ul]:list-disc">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
            <div className="flex items-center justify-between">
              <time
                dateTime={note.updated_at}
                suppressHydrationWarning
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(note.updated_at)}
              </time>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit note"
                  onClick={() => setEditingNote(note)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Archive note"
                  onClick={() => setArchivingNote(note)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ApplicationNoteFormDialog
        open={!!editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
        applicationId={applicationId}
        note={editingNote ?? undefined}
      />
      <ConfirmDialog
        open={!!archivingNote}
        onOpenChange={(open) => !open && setArchivingNote(null)}
        title="Archive this note?"
        description="Archived notes are hidden but preserved."
        confirmLabel="Archive"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
