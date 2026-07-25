import { ACHIEVEMENT_DEFINITIONS } from "@/features/goals/constants/goal.constants";
import { AchievementRepository } from "@/features/goals/repositories/achievement.repository";
import { evaluateAchievements } from "@/features/goals/utils/achievement-calculations";
import type {
  AchievementState,
  StreakSummary,
} from "@/features/goals/types/goal.types";
import type { ApplicationHistoryFacts } from "@/features/analytics/utils/analytics-calculations";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";
import type { ActionResult } from "@/types/action-result";

const LABEL_BY_KEY = new Map(
  ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.key, definition.label])
);

// "ACHIEVEMENTS" (IMPLEMENTATION_ORDER_V2.md Phase 35). GoalService is the
// only caller - achievements are evaluated as a side effect of loading the
// Goals page/dashboard widget (there is no background job/cron in this
// application, so "unlock automatically" means "evaluated, and persisted if
// newly true, on the next read" - the same lazy-detect-and-persist shape
// this codebase already uses for `CompanyService.findOrCreateByName`).
export const AchievementService = {
  // Evaluates every achievement against the given (already bulk-fetched)
  // context, unlocks whichever are newly earned, and returns the complete
  // unlocked set (pre-existing + newly unlocked) so the caller never needs
  // a second read.
  async evaluateAndUnlock(
    userId: string,
    context: {
      apps: AnalyticsApplicationRow[];
      historyFacts: Map<string, ApplicationHistoryFacts>;
      streaks: StreakSummary;
    }
  ): Promise<ActionResult<{ key: string; unlockedAt: string }[]>> {
    const { data: existingRows, error } =
      await AchievementRepository.listUnlockedForUser(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading achievements.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    const unlocked = new Map(
      (existingRows ?? []).map((row) => [
        row.achievement_key,
        row.unlocked_at,
      ])
    );

    const earnedKeys = evaluateAchievements(context);
    const newlyEarned = earnedKeys.filter((key) => !unlocked.has(key));

    for (const key of newlyEarned) {
      const { data, error: unlockError } = await AchievementRepository.unlock(
        userId,
        key
      );

      if (unlockError) {
        // A concurrent request already unlocked the same achievement -
        // idempotent, not a failure (mirrors CompanyService.findOrCreateByName's
        // own race-condition handling for a different unique constraint).
        // It is still genuinely unlocked (that's what the conflict means),
        // so it must still appear in the returned set - only the exact
        // timestamp is approximated here, since the winning row's own
        // unlocked_at isn't returned by this insert.
        if (unlockError.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
          unlocked.set(key, new Date().toISOString());
        }
        // Best-effort: any other failed unlock write never blocks the page
        // itself from loading (the same "best-effort side effect" precedent
        // JobImportService's note-attachment step already established) -
        // that achievement just isn't reflected this time.
        continue;
      }

      if (data) unlocked.set(data.achievement_key, data.unlocked_at);
    }

    return {
      success: true,
      data: [...unlocked.entries()].map(([key, unlockedAt]) => ({
        key,
        unlockedAt,
      })),
    };
  },

  // Formats the full catalog (locked + unlocked) for display - the Goals
  // page shows every achievement, not just earned ones, so users can see
  // what's still ahead.
  buildAchievementStates(
    unlocked: { key: string; unlockedAt: string }[]
  ): AchievementState[] {
    const unlockedByKey = new Map(
      unlocked.map((entry) => [entry.key, entry.unlockedAt])
    );

    return ACHIEVEMENT_DEFINITIONS.map((definition) => ({
      definition,
      unlocked: unlockedByKey.has(definition.key),
      unlockedAt: unlockedByKey.get(definition.key) ?? null,
    }));
  },

  labelFor(key: string): string {
    return LABEL_BY_KEY.get(key) ?? key;
  },
};
