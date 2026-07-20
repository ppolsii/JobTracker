"use client";

import { ApplicationForm } from "@/features/applications/components/ApplicationForm";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: ApplicationWithRelations;
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}

// Fully controlled - the caller owns the open state and renders its own
// trigger (a visible "Create application" button, or a row's "Edit" action).
export function ApplicationFormDialog({
  open,
  onOpenChange,
  application,
  companies,
  cvVersions,
}: ApplicationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {application ? "Edit application" : "Create application"}
          </DialogTitle>
          <DialogDescription>
            {application
              ? "Update this application's details."
              : "Register a job application you're tracking."}
          </DialogDescription>
        </DialogHeader>
        <ApplicationForm
          application={application}
          companies={companies}
          cvVersions={cvVersions}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
