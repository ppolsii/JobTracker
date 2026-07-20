"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ApplicationFormDialog } from "@/features/applications/components/ApplicationFormDialog";
import { Button } from "@/shared/components/ui/button";

export function ApplicationCreateButton({
  companies,
  cvVersions,
}: {
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Create application
      </Button>
      <ApplicationFormDialog
        open={open}
        onOpenChange={setOpen}
        companies={companies}
        cvVersions={cvVersions}
      />
    </>
  );
}
