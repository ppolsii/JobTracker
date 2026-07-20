"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveApplicationAction } from "@/features/applications/actions/application.actions";
import { ApplicationFormDialog } from "@/features/applications/components/ApplicationFormDialog";
import { ChangeApplicationStatusDialog } from "@/features/applications/components/ChangeApplicationStatusDialog";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import { ROUTES } from "@/config/routes";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";

// Bundles the Application Detail page's "Actions" section (UI_SYSTEM.md
// "Application Detail"): Change Status, Edit, Archive. Structurally similar
// to the per-row dialogs ApplicationsTable already manages, but not
// extracted into a shared hook - each usage's exact target (a selected row
// vs. this page's single fixed application) and post-action navigation
// differ enough, and per this session's "abstractions should emerge only
// after multiple real use cases demonstrate they are necessary," this stays
// local for now.
export function ApplicationDetailActions({
  application,
  companies,
  cvVersions,
}: {
  application: ApplicationWithRelations;
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchiveConfirm() {
    startTransition(async () => {
      const result = await archiveApplicationAction({ id: application.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${application.position} archived.`);
      router.push(ROUTES.APPLICATIONS);
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" onClick={() => setChangingStatus(true)}>
          Change status
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setArchiving(true)}
        >
          Archive
        </Button>
      </div>

      <ApplicationFormDialog
        open={editing}
        onOpenChange={setEditing}
        application={application}
        companies={companies}
        cvVersions={cvVersions}
      />
      <ChangeApplicationStatusDialog
        open={changingStatus}
        onOpenChange={setChangingStatus}
        application={application}
      />
      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title={`Archive ${application.position}?`}
        description="Archived applications are hidden from lists but preserved for historical analytics."
        confirmLabel="Archive"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
