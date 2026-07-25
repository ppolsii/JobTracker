"use client";

import { MoreVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  archiveGoalAction,
  deleteGoalAction,
  pauseGoalAction,
  reactivateGoalAction,
} from "@/features/goals/actions/goal.actions";
import { GoalFormDialog } from "@/features/goals/components/GoalFormDialog";
import { GOAL_STATUS_LABELS } from "@/features/goals/constants/goal.constants";
import type { GoalWithProgress } from "@/features/goals/types/goal.types";
import { getGoalDisplayTitle } from "@/features/goals/utils/goal-calculations";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Progress } from "@/shared/components/ui/progress";

// "PROGRESS": progress bar, current value, target value, remaining amount,
// percentage, estimated completion date - all read straight off the
// already-computed GoalProgress, never recalculated in the component layer.
export function GoalCard({ goalWithProgress }: { goalWithProgress: GoalWithProgress }) {
  const { goal, progress } = goalWithProgress;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function runAction(
    action: (input: { id: string }) => Promise<{ success: boolean; error?: { message: string } }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action({ id: goal.id });
      if (!result.success) {
        toast.error(result.error?.message ?? "Something went wrong.");
        return;
      }
      toast.success(successMessage);
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const result = await deleteGoalAction({ id: goal.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Goal deleted.");
      setDeleting(false);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{getGoalDisplayTitle(goal)}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={goal.status === "active" ? "default" : "secondary"}>
              {GOAL_STATUS_LABELS[goal.status]}
            </Badge>
            {progress.isCompleted ? (
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-500">
                Achieved
              </Badge>
            ) : null}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Goal actions" />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Edit</DropdownMenuItem>
            {goal.status === "active" ? (
              <DropdownMenuItem onClick={() => runAction(pauseGoalAction, "Goal paused.")}>
                Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => runAction(reactivateGoalAction, "Goal reactivated.")}
              >
                Reactivate
              </DropdownMenuItem>
            )}
            {goal.status !== "archived" ? (
              <DropdownMenuItem
                onClick={() => runAction(archiveGoalAction, "Goal archived.")}
              >
                Archive
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.current} / {progress.target}
          </span>
          <span className="font-medium">{progress.percentage}%</span>
        </div>

        <Progress
          value={Math.min(progress.current, progress.target)}
          max={progress.target}
          aria-label={`${getGoalDisplayTitle(goal)} progress`}
          indicatorClassName={progress.isCompleted ? "bg-emerald-500" : undefined}
        />

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <span>Remaining: {progress.remaining}</span>
          {progress.periodEnd ? <span>Ends: {progress.periodEnd}</span> : null}
        </div>

        {!progress.isCompleted && progress.estimatedCompletionDate ? (
          <p className="text-sm text-muted-foreground">
            Estimated completion: {progress.estimatedCompletionDate}
          </p>
        ) : null}
      </CardContent>

      <GoalFormDialog open={editing} onOpenChange={setEditing} goal={goal} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${getGoalDisplayTitle(goal)}?`}
        description="This removes the goal permanently. Your applications and their history are never affected."
        confirmLabel="Delete"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}
