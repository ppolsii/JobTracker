"use client";

import { CompanyForm } from "@/features/companies/components/CompanyForm";
import type { Company } from "@/features/companies/types/company.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
}

// Fully controlled - the caller owns the open state and renders its own
// trigger (a visible "Create company" button, or a row's "Edit" action).
export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: CompanyFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company ? "Edit company" : "Create company"}</DialogTitle>
          <DialogDescription>
            {company
              ? "Update this company's details."
              : "Add a company you're applying to."}
          </DialogDescription>
        </DialogHeader>
        <CompanyForm
          company={company}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
