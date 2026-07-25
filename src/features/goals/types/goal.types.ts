import type { Database } from "@/types/supabase";

export type GoalRecord = Database["public"]["Tables"]["goals"]["Row"];
export type GoalMetric = Database["public"]["Enums"]["goal_metric"];
export type GoalPeriod = Database["public"]["Enums"]["goal_period"];
export type GoalStatus = Database["public"]["Enums"]["goal_status"];

export type UserAchievementRecord =
  Database["public"]["Tables"]["user_achievements"]["Row"];

// "PROGRESS": current/target/remaining/percentage/estimated completion date,
// plus the window it was computed over (needed by the Calendar integration's
// deadline event - `periodEnd` is null only for 'total' goals, which never
// reset and so have no natural deadline).
export interface GoalProgress {
  current: number;
  target: number;
  remaining: number;
  percentage: number;
  estimatedCompletionDate: string | null;
  periodStart: string;
  periodEnd: string | null;
  isCompleted: boolean;
}

export interface GoalWithProgress {
  goal: GoalRecord;
  progress: GoalProgress;
}

// "STREAKS": current/longest for three distinct units. Daily figures are
// never recomputed here - they are ApplicationHistoryFacts-adjacent output
// this feature reuses as-is from Advanced Analytics' own
// computeActivityAnalysis (ANALYTICS INTEGRATION: "reuse Analytics
// calculations, do not duplicate metrics"). Weekly/monthly are genuinely new
// (no earlier phase computed them).
export interface StreakSummary {
  currentDayStreak: number;
  longestDayStreak: number;
  currentWeekStreak: number;
  longestWeekStreak: number;
  currentMonthStreak: number;
  longestMonthStreak: number;
}

// "STATISTICS". `averageCompletionDays` is scoped to one-time ('total')
// goals only - see goal-calculations.ts's own note on why a recurring
// goal's "completion time" has no single honest meaning.
export interface GoalStatistics {
  completedGoals: number;
  activeGoals: number;
  completionRate: number | null;
  averageCompletionDays: number | null;
  longestStreak: number;
  currentStreak: number;
}

export interface AchievementDefinition {
  key: string;
  label: string;
  description: string;
}

export interface AchievementState {
  definition: AchievementDefinition;
  unlocked: boolean;
  unlockedAt: string | null;
}

// "DASHBOARD WIDGET": a compact, pre-shaped projection - never a second copy
// of the full page's computation, just a smaller view over the same
// GoalWithProgress[]/AchievementState[] the Goals page itself computes.
export interface DashboardGoalsWidgetData {
  todaysApplicationCount: number;
  weeklyGoals: GoalWithProgress[];
  recentlyUnlockedAchievements: AchievementState[];
  upcomingDeadlines: { goal: GoalRecord; progress: GoalProgress }[];
}

export interface CreateGoalInput {
  metric: GoalMetric;
  period: GoalPeriod;
  targetValue: number;
  title?: string;
}
