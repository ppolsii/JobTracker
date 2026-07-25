import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";
import { BillingService } from "@/features/billing/services/billing.service";
import { AchievementService } from "@/features/goals/services/achievement.service";
import { GoalRepository } from "@/features/goals/repositories/goal.repository";
import type { CreateGoalInput, GoalRecord, GoalStatus, GoalWithProgress } from "@/features/goals/types/goal.types";
import {
  buildDashboardGoalsWidgetData,
  buildStreakSummary,
  computeGoalProgress,
  computeGoalStatistics,
} from "@/features/goals/utils/goal-calculations";
import { computeActivityAnalysis } from "@/features/analytics/utils/advanced-analytics-calculations";
import { buildHistoryFactsByApplication } from "@/features/analytics/utils/analytics-calculations";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER_V2.md Phase 35 (Goals, Achievements & Progress).
// Owns the whole Goals workflow - Pro-gating, bulk fetching, progress/streak
// computation, lazy achievement unlocking, and goal CRUD - Repositories stay
// data-access only. Reuses every existing bulk-read method already
// established elsewhere (ApplicationService.listAllForAnalytics,
// ApplicationStatusService.listHistoryForApplications - the same pair
// Analytics/Advanced Analytics/Calendar already fetch) rather than adding a
// new query - "reuse existing Analytics/Timeline/Status History
// infrastructure, do not duplicate business logic."
interface GoalContext {
  apps: AnalyticsApplicationRow[];
  goalsWithProgress: GoalWithProgress[];
  streaks: ReturnType<typeof buildStreakSummary>;
  achievements: { key: string; unlockedAt: string }[];
}

async function loadContext(userId: string, today: Date): Promise<ActionResult<GoalContext>> {
  const [applicationsResult, goalsResult] = await Promise.all([
    ApplicationService.listAllForAnalytics(userId),
    GoalRepository.listAllForUser(userId),
  ]);

  if (!applicationsResult.success) return applicationsResult;
  if (goalsResult.error) {
    return {
      success: false,
      error: {
        message: "Something went wrong while loading your goals.",
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    };
  }

  const apps = applicationsResult.data;
  const goals = (goalsResult.data ?? []) as GoalRecord[];

  const historyResult = await ApplicationStatusService.listHistoryForApplications(
    apps.map((app) => app.id)
  );
  if (!historyResult.success) return historyResult;

  const historyFacts = buildHistoryFactsByApplication(historyResult.data);
  const dayActivity = computeActivityAnalysis(apps, [], today);
  const streaks = buildStreakSummary(
    apps,
    {
      current: dayActivity.currentStreakDays,
      longest: dayActivity.longestStreakDays,
    },
    today
  );

  const goalsWithProgress: GoalWithProgress[] = [];
  for (const goal of goals) {
    const progress = computeGoalProgress(goal, apps, historyFacts, today);

    // "Total" goals complete once, permanently - persisted the first time
    // they're detected (lazy, on read - the same "compute, persist if newly
    // true" shape AchievementService below uses). Best-effort: a failed
    // write never blocks the page from loading.
    if (goal.period === "total" && !goal.completed_at && progress.isCompleted) {
      const { data } = await GoalRepository.update(userId, goal.id, {
        completed_at: today.toISOString(),
      });
      goalsWithProgress.push({
        goal: (data as GoalRecord | null) ?? { ...goal, completed_at: today.toISOString() },
        progress,
      });
      continue;
    }

    goalsWithProgress.push({ goal, progress });
  }

  const achievementsResult = await AchievementService.evaluateAndUnlock(userId, {
    apps,
    historyFacts,
    streaks,
  });
  if (!achievementsResult.success) return achievementsResult;

  return {
    success: true,
    data: {
      apps,
      goalsWithProgress,
      streaks,
      achievements: achievementsResult.data,
    },
  };
}

export const GoalService = {
  async getGoalsPageData(userId: string, today: Date = new Date()) {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const context = await loadContext(userId, today);
    if (!context.success) return context;

    const { goalsWithProgress, streaks, achievements } = context.data;
    const statistics = computeGoalStatistics(goalsWithProgress, streaks);
    const achievementStates = AchievementService.buildAchievementStates(achievements);

    return {
      success: true as const,
      data: { goalsWithProgress, streaks, statistics, achievements: achievementStates },
    };
  },

  // "DASHBOARD WIDGET". A `FORBIDDEN` result lets the Dashboard page render
  // a compact Pro teaser instead of the full gate - the same "attempt the
  // action, react to FORBIDDEN" pattern every other Pro surface uses.
  async getDashboardWidgetData(userId: string, today: Date = new Date()) {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const context = await loadContext(userId, today);
    if (!context.success) return context;

    const { apps, goalsWithProgress, achievements } = context.data;
    const achievementLabels = new Map(
      achievements.map(({ key }) => [key, AchievementService.labelFor(key)])
    );

    const widget = buildDashboardGoalsWidgetData(
      apps,
      goalsWithProgress,
      achievements,
      achievementLabels,
      today
    );

    return { success: true as const, data: widget };
  },

  // "CALENDAR INTEGRATION". No Pro re-gate here - CalendarService.getEvents
  // already requires Pro before it reads anything (the same "single
  // Pro-gated entry point" discipline InterviewFeedbackService.listAllForUser/
  // ApplicationNoteService.listAllForUser already follow when Calendar reads
  // them).
  async listGoalsWithProgressForCalendar(
    userId: string,
    today: Date = new Date()
  ): Promise<ActionResult<GoalWithProgress[]>> {
    const context = await loadContext(userId, today);
    if (!context.success) return context;
    return { success: true, data: context.data.goalsWithProgress };
  },

  async createGoal(userId: string, input: CreateGoalInput): Promise<ActionResult<GoalRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { data, error } = await GoalRepository.create({
      user_id: userId,
      metric: input.metric,
      period: input.period,
      target_value: input.targetValue,
      title: input.title?.trim() || null,
    });

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while creating the goal.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },

  async updateGoal(
    userId: string,
    id: string,
    input: CreateGoalInput
  ): Promise<ActionResult<GoalRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { data, error } = await GoalRepository.update(userId, id, {
      metric: input.metric,
      period: input.period,
      target_value: input.targetValue,
      title: input.title?.trim() || null,
    });

    if (error || !data) {
      return {
        success: false,
        error: { message: "Goal not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    return { success: true, data };
  },

  // Backs Pause/Reactivate/Archive - three user-facing verbs, one
  // underlying `status` column (BUSINESS_RULES.md pattern already used by
  // Application Status/Goal itself: a small closed set of states, not three
  // separate booleans).
  async setGoalStatus(
    userId: string,
    id: string,
    status: GoalStatus
  ): Promise<ActionResult<GoalRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { data, error } = await GoalRepository.update(userId, id, { status });

    if (error || !data) {
      return {
        success: false,
        error: { message: "Goal not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    return { success: true, data };
  },

  // "Delete" - distinct from `setGoalStatus(..., "archived")`. Soft delete
  // only (BUSINESS_RULES.md "Soft Deletes").
  async deleteGoal(userId: string, id: string): Promise<ActionResult<GoalRecord>> {
    const pro = await BillingService.requireProPlan(userId);
    if (!pro.success) return pro;

    const { data, error } = await GoalRepository.softDelete(userId, id);

    if (error || !data) {
      return {
        success: false,
        error: { message: "Goal not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    return { success: true, data };
  },
};
