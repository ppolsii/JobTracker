"use client";

import { Target } from "lucide-react";

import { CreateGoalButton } from "@/features/goals/components/CreateGoalButton";
import { GoalCard } from "@/features/goals/components/GoalCard";
import type { GoalWithProgress } from "@/features/goals/types/goal.types";
import { EmptyState } from "@/shared/components/EmptyState";

// "EMPTY STATES": "No active goals." / "Create your first goal." - the
// second only when there are no goals at all (any status); a user with only
// paused/archived goals sees the plainer "No active goals" instead, since
// they clearly do have goals, just none currently active.
export function GoalsBoard({ goalsWithProgress }: { goalsWithProgress: GoalWithProgress[] }) {
  const active = goalsWithProgress.filter(({ goal }) => goal.status === "active");
  const paused = goalsWithProgress.filter(({ goal }) => goal.status === "paused");
  const archived = goalsWithProgress.filter(({ goal }) => goal.status === "archived");

  if (goalsWithProgress.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No active goals."
        description="Create your first goal to start tracking your progress."
        action={<CreateGoalButton />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Active goals</h3>
        {active.length === 0 ? (
          <EmptyState icon={Target} title="No active goals." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((item) => (
              <GoalCard key={item.goal.id} goalWithProgress={item} />
            ))}
          </div>
        )}
      </section>

      {paused.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">Paused goals</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paused.map((item) => (
              <GoalCard key={item.goal.id} goalWithProgress={item} />
            ))}
          </div>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">Archived goals</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((item) => (
              <GoalCard key={item.goal.id} goalWithProgress={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
