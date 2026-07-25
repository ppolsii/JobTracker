"use client";

import { GoalForm } from "@/features/goals/components/GoalForm";
import type { GoalRecord } from "@/features/goals/types/goal.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalRecord;
}

// Fully controlled, matching every other FormDialog in this codebase (see
// CustomEventFormDialog).
export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "Create goal"}</DialogTitle>
          <DialogDescription>
            {goal
              ? "Update this goal's metric, period, or target."
              : "Set a target to stay consistent during your job search."}
          </DialogDescription>
        </DialogHeader>
        <GoalForm
          goal={goal}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
