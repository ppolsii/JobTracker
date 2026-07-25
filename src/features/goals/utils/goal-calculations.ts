import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { GOAL_METRIC_LABELS, GOAL_PERIOD_LABELS } from "@/features/goals/constants/goal.constants";
import type {
  DashboardGoalsWidgetData,
  GoalMetric,
  GoalPeriod,
  GoalProgress,
  GoalRecord,
  GoalStatistics,
  GoalWithProgress,
  StreakSummary,
} from "@/features/goals/types/goal.types";
import type {
  ApplicationHistoryFacts,
} from "@/features/analytics/utils/analytics-calculations";
import { roundTo } from "@/features/analytics/utils/analytics-calculations";
import type { AnalyticsApplicationRow } from "@/features/applications/types/application.types";

// Pure calculation helpers for Goals, Achievements & Progress
// (IMPLEMENTATION_ORDER_V2.md Phase 35) - no Supabase access, no I/O.
// GoalService is the only caller. "ANALYTICS INTEGRATION: reuse Analytics
// calculations, do not duplicate metrics" - every metric a goal tracks
// (applications/interviews/offers/recruiter_contacts) is read directly off
// AnalyticsApplicationRow/ApplicationHistoryFacts, the exact same bulk data
// Analytics/Advanced Analytics/Calendar already fetch - no new Repository
// method, no new query shape.

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const fromMs = new Date(`${fromKey}T00:00:00.000Z`).getTime();
  const toMs = new Date(`${toKey}T00:00:00.000Z`).getTime();
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

// Monday-start week/month boundaries - the same Monday-offset arithmetic
// calendar-calculations.ts's buildWeekGrid already uses, reimplemented here
// as a small, generic date utility (not a business rule) since importing it
// from the Calendar feature would invert this phase's actual dependency
// direction (Calendar depends on Goals for deadline events, not the other
// way around).
function mondayOfWeek(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday);
  return toDateKey(date);
}

function firstOfMonth(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

function lastOfMonth(dateKey: string): string {
  const date = new Date(`${firstOfMonth(dateKey)}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateKey(date);
}

function quarterStartMonth(month: number): number {
  return Math.floor(month / 3) * 3;
}

// "GOAL TYPES": each period maps to a [start, end] window over "today" -
// `end: null` only for 'total' (cumulative, never resets - there is no
// natural deadline to show).
export function getPeriodWindow(
  period: GoalPeriod,
  today: Date
): { start: string; end: string | null } {
  const todayKey = toDateKey(today);

  switch (period) {
    case "weekly": {
      const start = mondayOfWeek(todayKey);
      return { start, end: addDays(start, 6) };
    }
    case "monthly":
      return { start: firstOfMonth(todayKey), end: lastOfMonth(todayKey) };
    case "quarterly": {
      const year = today.getUTCFullYear();
      const startMonth = quarterStartMonth(today.getUTCMonth());
      const start = toDateKey(new Date(Date.UTC(year, startMonth, 1)));
      const end = toDateKey(
        new Date(Date.UTC(year, startMonth + 3, 0))
      );
      return { start, end };
    }
    case "yearly": {
      const year = today.getUTCFullYear();
      return {
        start: toDateKey(new Date(Date.UTC(year, 0, 1))),
        end: toDateKey(new Date(Date.UTC(year, 11, 31))),
      };
    }
    case "total":
      return { start: "0001-01-01", end: null };
  }
}

// The timestamp a given application first reached the metric's event, or
// null if it never has. `applications` metric uses application_date itself
// (submission is not a status-history transition); the other three reuse
// ApplicationHistoryFacts fields Phase 29/33 already compute - "do not
// duplicate metrics."
function metricTimestamp(
  metric: GoalMetric,
  app: AnalyticsApplicationRow,
  facts: ApplicationHistoryFacts | undefined
): string | null {
  switch (metric) {
    case "applications":
      return app.application_date;
    case "recruiter_contacts":
      return facts?.recruiterContactEnteredAt ?? null;
    case "interviews":
      return facts?.firstInterviewEnteredAt ?? null;
    case "offers":
      return facts?.offerEnteredAt ?? null;
  }
}

// Counts every application whose metric timestamp falls within [start, end]
// (end inclusive; end === null means unbounded/all-time, for 'total' goals).
// A date-only timestamp (application_date) is compared as-is; a full
// history timestamp is truncated to its date component first, so a goal's
// window boundary is always a calendar-day boundary, matching how every
// other date filter in this codebase (Advanced Analytics, Calendar) already
// treats `dateFrom`/`dateTo`.
export function countMetricInWindow(
  metric: GoalMetric,
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>,
  window: { start: string; end: string | null }
): number {
  let count = 0;
  for (const app of apps) {
    const timestamp = metricTimestamp(metric, app, historyFacts.get(app.id));
    if (!timestamp) continue;
    const dateKey = timestamp.slice(0, 10);
    if (dateKey < window.start) continue;
    if (window.end && dateKey > window.end) continue;
    count += 1;
  }
  return count;
}

// The earliest metric timestamp across every matching application - used as
// the "pace" baseline for a 'total' goal's estimated completion date (a
// recurring goal already has a fixed, short period start; 'total' has none,
// so the estimate needs the earliest real data point instead).
function earliestMetricTimestamp(
  metric: GoalMetric,
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>
): string | null {
  let earliest: string | null = null;
  for (const app of apps) {
    const timestamp = metricTimestamp(metric, app, historyFacts.get(app.id));
    if (!timestamp) continue;
    const dateKey = timestamp.slice(0, 10);
    if (!earliest || dateKey < earliest) earliest = dateKey;
  }
  return earliest;
}

// "Estimated completion date": current pace (progress so far / days elapsed
// since the period - or, for 'total' goals, since the earliest matching
// application - started) extrapolated forward to when `remaining` more
// would be reached at that same rate. Returns null when already complete or
// when there isn't yet enough data to extrapolate from (zero progress, or a
// window that has just started) - an honest "not enough data" rather than a
// fabricated date, matching this codebase's existing "not enough historical
// data" precedent (ANALYTICS_ENGINE.md).
export function computeEstimatedCompletionDate(
  current: number,
  target: number,
  paceStart: string,
  today: Date
): string | null {
  if (current >= target) return null;

  const todayKey = toDateKey(today);
  const daysElapsed = Math.max(1, daysBetweenDateKeys(paceStart, todayKey) + 1);
  const rate = current / daysElapsed;
  if (rate <= 0) return null;

  const remaining = target - current;
  const daysNeeded = Math.ceil(remaining / rate);
  return addDays(todayKey, daysNeeded);
}

// "PROGRESS": current/target/remaining/percentage/estimated completion date,
// computed live - never cached (mirrors Analytics' own "always compute from
// source of truth" philosophy).
export function computeGoalProgress(
  goal: GoalRecord,
  apps: AnalyticsApplicationRow[],
  historyFacts: Map<string, ApplicationHistoryFacts>,
  today: Date
): GoalProgress {
  const window = getPeriodWindow(goal.period, today);
  const current = countMetricInWindow(goal.metric, apps, historyFacts, window);
  const target = goal.target_value;
  const remaining = Math.max(0, target - current);
  const percentage = target > 0 ? roundTo(Math.min(100, (current / target) * 100), 1) : 0;

  const paceStart =
    goal.period === "total"
      ? (earliestMetricTimestamp(goal.metric, apps, historyFacts) ?? window.start)
      : window.start;

  return {
    current,
    target,
    remaining,
    percentage,
    estimatedCompletionDate: computeEstimatedCompletionDate(
      current,
      target,
      paceStart,
      today
    ),
    periodStart: window.start,
    periodEnd: window.end,
    isCompleted: current >= target,
  };
}

export function getGoalDisplayTitle(goal: GoalRecord): string {
  if (goal.title && goal.title.trim().length > 0) return goal.title;
  return `${GOAL_METRIC_LABELS[goal.metric]} - ${GOAL_PERIOD_LABELS[goal.period]}`;
}

// Generic "longest/current consecutive run" over a set of distinct calendar
// units (weeks or months, each represented by their own start-date key) -
// the same shape computeActivityAnalysis already uses for daily streaks
// (Advanced Analytics, Phase 33 - reused as-is below, never recomputed
// here), generalized to a caller-supplied "next unit" step function so
// weekly/monthly streaks share one algorithm instead of two near-identical
// copies.
function computeConsecutiveStreak(
  sortedUnitStartKeys: string[],
  todayUnitStartKey: string,
  nextUnitStartKey: (key: string) => string
): { current: number; longest: number } {
  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const key of sortedUnitStartKeys) {
    run = previous !== null && nextUnitStartKey(previous) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = key;
  }

  let current = 0;
  if (sortedUnitStartKeys.length > 0) {
    const last = sortedUnitStartKeys[sortedUnitStartKeys.length - 1];

    if (last === todayUnitStartKey || nextUnitStartKey(last) === todayUnitStartKey) {
      current = 1;
      for (let i = sortedUnitStartKeys.length - 1; i > 0; i--) {
        if (nextUnitStartKey(sortedUnitStartKeys[i - 1]) !== sortedUnitStartKeys[i]) {
          break;
        }
        current += 1;
      }
    }
  }

  return { current, longest };
}

function nextWeekStartKey(key: string): string {
  return addDays(key, 7);
}

function nextMonthStartKey(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return toDateKey(date);
}

// "STREAKS - Weekly streak": consecutive ISO (Monday-start) weeks containing
// at least one application - "current" only counts if the most recent
// active week is this week or last week (otherwise it's broken, mirroring
// the daily streak's own "today or yesterday" rule one level up).
export function computeWeeklyStreak(
  apps: AnalyticsApplicationRow[],
  today: Date
): { current: number; longest: number } {
  const weekKeys = [
    ...new Set(
      apps
        .map((app) => app.application_date)
        .filter((date): date is string => date !== null)
        .map(mondayOfWeek)
    ),
  ].sort();

  return computeConsecutiveStreak(
    weekKeys,
    mondayOfWeek(toDateKey(today)),
    nextWeekStartKey
  );
}

// "STREAKS - Monthly streak": same shape, one calendar month per unit.
export function computeMonthlyStreak(
  apps: AnalyticsApplicationRow[],
  today: Date
): { current: number; longest: number } {
  const monthKeys = [
    ...new Set(
      apps
        .map((app) => app.application_date)
        .filter((date): date is string => date !== null)
        .map(firstOfMonth)
    ),
  ].sort();

  return computeConsecutiveStreak(
    monthKeys,
    firstOfMonth(toDateKey(today)),
    nextMonthStartKey
  );
}

// Merges the reused daily streak (computeActivityAnalysis's own output,
// passed in by the caller - never recomputed here) with the two new weekly/
// monthly streaks into the one summary the Goals page/dashboard widget show.
export function buildStreakSummary(
  apps: AnalyticsApplicationRow[],
  dayStreak: { current: number; longest: number },
  today: Date
): StreakSummary {
  const week = computeWeeklyStreak(apps, today);
  const month = computeMonthlyStreak(apps, today);

  return {
    currentDayStreak: dayStreak.current,
    longestDayStreak: dayStreak.longest,
    currentWeekStreak: week.current,
    longestWeekStreak: week.longest,
    currentMonthStreak: month.current,
    longestMonthStreak: month.longest,
  };
}

// "STATISTICS". `averageCompletionDays` only ever averages 'total'-period
// goals' `completed_at - created_at` - a recurring goal's periods reset
// forever, so it has no single "time to completion" a plain average could
// honestly represent (documented simplification, not silently assumed).
export function computeGoalStatistics(
  goalsWithProgress: GoalWithProgress[],
  streaks: StreakSummary
): GoalStatistics {
  const nonArchived = goalsWithProgress.filter(
    ({ goal }) => goal.status !== "archived"
  );
  const activeGoals = nonArchived.filter(
    ({ goal }) => goal.status === "active"
  ).length;

  const totalGoalsWithCompletion = goalsWithProgress.filter(
    ({ goal }) => goal.period === "total"
  );
  const completedTotalGoals = totalGoalsWithCompletion.filter(
    ({ goal }) => goal.completed_at !== null
  );

  const completionRate =
    totalGoalsWithCompletion.length > 0
      ? roundTo(
          (completedTotalGoals.length / totalGoalsWithCompletion.length) * 100,
          1
        )
      : null;

  const completionDurations = completedTotalGoals
    .map(({ goal }) => {
      if (!goal.completed_at) return null;
      return daysBetweenDateKeys(
        goal.created_at.slice(0, 10),
        goal.completed_at.slice(0, 10)
      );
    })
    .filter((value): value is number => value !== null);

  const averageCompletionDays =
    completionDurations.length > 0
      ? roundTo(
          completionDurations.reduce((sum, value) => sum + value, 0) /
            completionDurations.length,
          1
        )
      : null;

  return {
    completedGoals: completedTotalGoals.length,
    activeGoals,
    completionRate,
    averageCompletionDays,
    longestStreak: streaks.longestDayStreak,
    currentStreak: streaks.currentDayStreak,
  };
}

// "CALENDAR INTEGRATION": one deadline event per active, recurring
// (non-'total') goal, at its current period's end date - 'total' goals
// never reset and so have no natural deadline to show. "Completed goals
// should appear visually" is satisfied by the `goalCompleted` flag the
// caller (CalendarService) merges onto the derived CalendarEvent - the
// actual visual treatment (color/icon) lives in the Calendar feature's own
// components, not duplicated here.
export function buildGoalDeadlineEvents(
  goalsWithProgress: GoalWithProgress[]
): CalendarEvent[] {
  return goalsWithProgress
    .filter(({ goal }) => goal.status === "active" && goal.period !== "total")
    .map(({ goal, progress }): CalendarEvent | null => {
      if (!progress.periodEnd) return null;
      return {
        id: `goal-${goal.id}-${progress.periodEnd}`,
        type: "goal_deadline",
        title: `${getGoalDisplayTitle(goal)} goal`,
        date: progress.periodEnd,
        applicationId: null,
        applicationStatusHistoryId: null,
        companyId: null,
        companyName: null,
        position: null,
        description: `${progress.current} / ${progress.target} - ${progress.percentage}% complete`,
        workMode: null,
        employmentType: null,
        applicationStatus: null,
        isCustom: false,
        goalCompleted: progress.isCompleted,
      };
    })
    .filter((event): event is CalendarEvent => event !== null);
}

// "DASHBOARD WIDGET": a compact projection, never a second computation.
export function buildDashboardGoalsWidgetData(
  apps: AnalyticsApplicationRow[],
  goalsWithProgress: GoalWithProgress[],
  achievements: { key: string; unlockedAt: string }[],
  achievementLabels: Map<string, string>,
  today: Date
): DashboardGoalsWidgetData {
  const todayKey = toDateKey(today);
  const todaysApplicationCount = apps.filter(
    (app) => app.application_date === todayKey
  ).length;

  const weeklyGoals = goalsWithProgress.filter(
    ({ goal }) => goal.status === "active" && goal.period === "weekly"
  );

  const recentlyUnlockedAchievements = [...achievements]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, 5)
    .map((entry) => ({
      definition: {
        key: entry.key,
        label: achievementLabels.get(entry.key) ?? entry.key,
        description: "",
      },
      unlocked: true,
      unlockedAt: entry.unlockedAt,
    }));

  const upcomingDeadlines = goalsWithProgress
    .filter(
      ({ goal, progress }) =>
        goal.status === "active" &&
        goal.period !== "total" &&
        progress.periodEnd !== null &&
        progress.periodEnd >= todayKey
    )
    .sort((a, b) => (a.progress.periodEnd ?? "").localeCompare(b.progress.periodEnd ?? ""))
    .slice(0, 5);

  return {
    todaysApplicationCount,
    weeklyGoals,
    recentlyUnlockedAchievements,
    upcomingDeadlines,
  };
}
