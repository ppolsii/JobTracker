"use client";

import { Plus, PenLine, Sparkles } from "lucide-react";
import { useState } from "react";

import { ApplicationFormDialog } from "@/features/applications/components/ApplicationFormDialog";
import { ImportJobDialog } from "@/features/job-import/components/ImportJobDialog";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type Mode = "closed" | "choice" | "import" | "manual";

// IMPLEMENTATION_ORDER_V2.md Phase 40 "NEW APPLICATION WORKFLOW": one
// primary "+ New Application" entry point everywhere an application can be
// created (Applications page, Dashboard) - replaces the old side-by-side
// "Import job" / "Create application" buttons with a single guided choice,
// then hands off to whichever existing, self-contained flow the user
// picked (Smart Job Import's ImportJobDialog, or the plain
// ApplicationFormDialog) - neither of those flows is duplicated or
// rebuilt, only fronted by this one extra step.
export function NewApplicationButton({
  companies,
  cvVersions,
}: {
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<Mode>("closed");

  return (
    <>
      <Button type="button" onClick={() => setMode("choice")}>
        <Plus className="size-4" />
        New application
      </Button>

      <Dialog
        open={mode === "choice"}
        onOpenChange={(open) => setMode(open ? "choice" : "closed")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New application</DialogTitle>
            <DialogDescription>
              How would you like to add it?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("import")}
              className="flex flex-col items-start gap-1.5 rounded-lg border border-input p-4 text-left transition-colors hover:border-ring hover:bg-accent"
            >
              <Sparkles className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                Import from job URL
              </span>
              <span className="text-xs text-muted-foreground">
                Pro - paste a posting link and we&apos;ll fill in the details
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="flex flex-col items-start gap-1.5 rounded-lg border border-input p-4 text-left transition-colors hover:border-ring hover:bg-accent"
            >
              <PenLine className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Create manually</span>
              <span className="text-xs text-muted-foreground">
                Fill in the application yourself
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportJobDialog
        open={mode === "import"}
        onOpenChange={(open) => setMode(open ? "import" : "closed")}
        cvVersions={cvVersions}
      />
      <ApplicationFormDialog
        open={mode === "manual"}
        onOpenChange={(open) => setMode(open ? "manual" : "closed")}
        companies={companies}
        cvVersions={cvVersions}
      />
    </>
  );
}
