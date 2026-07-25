import { AchievementIcon } from "@/features/goals/components/AchievementIcon";
import type { AchievementState } from "@/features/goals/types/goal.types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

// "ACHIEVEMENTS": every achievement in the catalog is shown, locked or not,
// so users can see what's still ahead - unlocking is fully automatic
// (AchievementService), this component only displays state.
export function AchievementsGrid({ achievements }: { achievements: AchievementState[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {achievements.map((achievement) => (
        <Tooltip key={achievement.definition.key}>
          <TooltipTrigger
            render={
              <div
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center",
                  achievement.unlocked
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                    : "opacity-40 grayscale"
                )}
              />
            }
          >
            <AchievementIcon
              achievementKey={achievement.definition.key}
              className={cn(
                "size-6",
                achievement.unlocked ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}
            />
            <span className="text-xs font-medium">{achievement.definition.label}</span>
          </TooltipTrigger>
          <TooltipContent>{achievement.definition.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
