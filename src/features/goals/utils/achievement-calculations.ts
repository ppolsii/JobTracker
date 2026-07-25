import {
  APPLICATION_MILESTONES,
  CONSISTENT_WEEK_APPLICATION_THRESHOLD,
  INTERVIEW_MASTER_THRESHOLD,
  LONG_STREAK_DAYS_THRESHOLD,
  OFFER_HUNTER_THRESHOLD,
} from "@/features/goals/constants/goal.constants";
import type { StreakSummary } from "@/features/goals/types/goal.types";
import type { ApplicationHistoryFacts } from "@/features/analytics/utils/analytics-calculations";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";

// Pure achievement-eligibility predicates (IMPLEMENTATION_ORDER_V2.md Phase
// 35) - "Achievements unlock automatically." Every predicate here reuses
// already-computed facts (ApplicationHistoryFacts, StreakSummary) rather
// than re-deriving anything from raw history - "reuse Analytics/Timeline/
// Status History infrastructure, do not duplicate business logic."
// AchievementService is the only caller: it evaluates this list against a
// user's already-unlocked keys and persists whichever are newly true.

function submittedCount(apps: AnalyticsApplicationRow[]): number {
  return apps.filter((app) => app.application_date !== null).length;
}

function interviewReachedCount(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): number {
  return apps.filter(
    (app) => historyFacts.get(app.id)?.firstInterviewEnteredAt != null
  ).length;
}

function offersReceivedCount(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): number {
  return apps.filter((app) => historyFacts.get(app.id)?.offerEnteredAt != null)
    .length;
}

function hasAcceptedOffer(
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): boolean {
  return apps.some((app) => historyFacts.get(app.id)?.acceptedEnteredAt != null);
}

// "Consistent Week": at least CONSISTENT_WEEK_APPLICATION_THRESHOLD
// applications submitted within a single Monday-start ISO week - reuses the
// same Monday-offset date arithmetic goal-calculations.ts's streak
// functions already use (not a new date rule).
function hasConsistentWeek(apps: AnalyticsApplicationRow[]): boolean {
  const counts = new Map<string, number>();
  for (const app of apps) {
    if (!app.application_date) continue;
    const date = new Date(`${app.application_date}T00:00:00.000Z`);
    const weekday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - weekday);
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].some(
    (count) => count >= CONSISTENT_WEEK_APPLICATION_THRESHOLD
  );
}

interface AchievementContext {
  apps: AnalyticsApplicationRow[];
  historyFacts: Map<string, ApplicationHistoryFacts>;
  streaks: StreakSummary;
}

// Each entry: achievement key -> whether it is currently earned. Order
// mirrors ACHIEVEMENT_DEFINITIONS (goal.constants.ts) but is not itself
// load-bearing (evaluateAchievements returns whichever keys are true,
// unordered by significance).
export function evaluateAchievements(context: AchievementContext): string[] {
  const { apps, historyFacts, streaks } = context;
  const applications = submittedCount(apps);
  const interviews = interviewReachedCount(apps, historyFacts);
  const offers = offersReceivedCount(apps, historyFacts);

  const earned: string[] = [];

  for (const milestone of APPLICATION_MILESTONES) {
    if (applications >= milestone) {
      earned.push(
        milestone === 1 ? "first_application" : `applications_${milestone}`
      );
    }
  }

  if (interviews >= 1) earned.push("first_interview");
  if (offers >= 1) earned.push("first_offer");
  if (hasAcceptedOffer(apps, historyFacts)) earned.push("first_accepted_offer");
  if (interviews >= INTERVIEW_MASTER_THRESHOLD) earned.push("interview_master");
  if (offers >= OFFER_HUNTER_THRESHOLD) earned.push("offer_hunter");
  if (hasConsistentWeek(apps)) earned.push("consistent_week");
  if (streaks.longestDayStreak >= LONG_STREAK_DAYS_THRESHOLD) {
    earned.push("streak_30_days");
  }

  return earned;
}
