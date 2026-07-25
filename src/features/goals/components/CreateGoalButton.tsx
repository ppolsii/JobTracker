"use client";

import { useState } from "react";

import { GoalFormDialog } from "@/features/goals/components/GoalFormDialog";
import { Button } from "@/shared/components/ui/button";

export function CreateGoalButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Create goal
      </Button>
      <GoalFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
