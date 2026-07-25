-- Goals, Achievements & Progress (IMPLEMENTATION_ORDER_V2.md Phase 35).
-- Two independent tables:
--   goals            - user-defined targets (e.g. "5 applications per week").
--                      Progress is never stored here - it is always computed
--                      live from applications/application_status_history
--                      (the same "never cache a derived number" philosophy
--                      Analytics already follows) - only the goal's own
--                      definition and status persist.
--   user_achievements - a permanent, append-only unlock log. Achievements are
--                      defined in code (goal.constants.ts's ACHIEVEMENT
--                      catalog), never in the database - this table only
--                      records *that* a given user unlocked a given key.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'goal_metric' and typnamespace = 'public'::regnamespace
  ) then
    -- Only the four built-in metrics this phase implements. A future
    -- "custom" goal (explicitly out of scope this phase - "should be
    -- supported in the future") adds one more enum value later
    -- (ALTER TYPE ... ADD VALUE), plus a UI field for what it measures -
    -- it does not require restructuring this table.
    create type public.goal_metric as enum (
      'applications',
      'interviews',
      'offers',
      'recruiter_contacts'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'goal_period' and typnamespace = 'public'::regnamespace
  ) then
    -- 'total' = cumulative, all-time, never resets (e.g. "100 total").
    -- Every other value is a recurring window that resets each period
    -- (e.g. "5 per week" recurs every week) - see goal-calculations.ts's
    -- getPeriodWindow.
    create type public.goal_period as enum (
      'weekly',
      'monthly',
      'quarterly',
      'yearly',
      'total'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'goal_status' and typnamespace = 'public'::regnamespace
  ) then
    create type public.goal_status as enum ('active', 'paused', 'archived');
  end if;
end
$$;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  metric public.goal_metric not null,
  period public.goal_period not null,
  target_value integer not null,
  -- Optional display label. When null, the UI derives one from
  -- metric + period (e.g. "Applications - Weekly") - see
  -- getGoalDisplayTitle. Kept nullable now so a future "custom" goal has
  -- somewhere to put a user-authored title without a schema change.
  title text,
  status public.goal_status not null default 'active',
  -- Only ever set for 'total' (non-recurring) goals, once, the first time
  -- their cumulative progress reaches target_value - see
  -- GoalService.getGoalsPageData. Recurring goals (weekly/monthly/...) are
  -- evaluated live each period and never set this column - "average
  -- completion time" is only a meaningful, honest statistic for one-time
  -- goals (documented in advanced-analytics-calculations.ts's own
  -- precedent for naming a deliberate simplification rather than
  -- fabricating a metric for the recurring case).
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint goals_target_value_positive check (target_value > 0)
);

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_user_id_status_idx
  on public.goals (user_id, status);

drop trigger if exists set_updated_at on public.goals;
create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

drop policy if exists "Users can view own goals" on public.goals;
create policy "Users can view own goals"
  on public.goals for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals"
  on public.goals for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
  on public.goals for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete grant/policy - "Delete" (GoalService.deleteGoal) is a soft
-- delete via deleted_at, matching every other business entity
-- (BUSINESS_RULES.md "Soft Deletes"). "Archive" is a distinct, visible
-- `status` value (still selectable, just excluded from the active/paused
-- view) - the two are deliberately different operations, per this phase's
-- own "Pause / Delete / Archive / Reactivate" action list.
grant select, insert, update on public.goals to authenticated;

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Matches an ACHIEVEMENT_DEFINITIONS key (goal.constants.ts) - not a FK,
  -- since the catalog itself lives in code, not in a database table
  -- (achievements are static, versioned with the app, not user data).
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index if not exists user_achievements_user_id_idx
  on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;

drop policy if exists "Users can view own achievements" on public.user_achievements;
create policy "Users can view own achievements"
  on public.user_achievements for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own achievements" on public.user_achievements;
create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (user_id = (select auth.uid()));

-- No update/delete grant or policy - achievements unlock automatically and
-- permanently ("Achievements unlock automatically"); there is no user or
-- system action that un-unlocks or edits one.
grant select, insert on public.user_achievements to authenticated;
