"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CompanyFormDialog } from "@/features/companies/components/CompanyFormDialog";
import { Button } from "@/shared/components/ui/button";

export function CompanyCreateButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Create company
      </Button>
      <CompanyFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
