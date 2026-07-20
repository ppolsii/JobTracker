"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CVVersionFormDialog } from "@/features/cv/components/CVVersionFormDialog";
import { Button } from "@/shared/components/ui/button";

export function CVVersionCreateButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Create CV version
      </Button>
      <CVVersionFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
