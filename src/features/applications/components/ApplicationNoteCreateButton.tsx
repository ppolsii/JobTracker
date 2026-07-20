"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ApplicationNoteFormDialog } from "@/features/applications/components/ApplicationNoteFormDialog";
import { Button } from "@/shared/components/ui/button";

export function ApplicationNoteCreateButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add note
      </Button>
      <ApplicationNoteFormDialog
        open={open}
        onOpenChange={setOpen}
        applicationId={applicationId}
      />
    </>
  );
}
