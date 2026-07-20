"use client";

import { CVVersionForm } from "@/features/cv/components/CVVersionForm";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface CVVersionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cvVersion?: CVVersion;
}

// Fully controlled - the caller owns the open state and renders its own
// trigger (a visible "Create CV version" button, or a row's "Edit" action).
export function CVVersionFormDialog({
  open,
  onOpenChange,
  cvVersion,
}: CVVersionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cvVersion ? "Edit CV version" : "Create CV version"}
          </DialogTitle>
          <DialogDescription>
            {cvVersion
              ? "Update this CV version's details."
              : "Add a CV version you use when applying."}
          </DialogDescription>
        </DialogHeader>
        <CVVersionForm
          cvVersion={cvVersion}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
