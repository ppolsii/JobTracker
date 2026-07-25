-- Notification Center & Smart Reminders (IMPLEMENTATION_ORDER_V2.md Phase
-- 36). Notification *content* is never stored - every notification (stale
-- application, interview reminder, goal progress, achievement unlock,
-- calendar event) is generated live, on every read, from data this app
-- already has (NotificationService, reusing CalendarService/GoalService/
-- AchievementService wholesale - "no duplicated business logic"). Only the
-- user's own interaction with a given notification - read/archived/deleted -
-- needs to persist, keyed by a deterministic `notification_key` the
-- generator derives from the underlying condition (e.g.
-- "application:no_activity:<application_id>"), so re-generating the list
-- never creates duplicate state rows and always reattaches the right state.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'notification_status' and typnamespace = 'public'::regnamespace
  ) then
    create type public.notification_status as enum ('unread', 'read', 'archived');
  end if;
end
$$;

create table if not exists public.notification_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  notification_key text not null,
  status public.notification_status not null default 'unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notification_states_user_key_unique unique (user_id, notification_key)
);

create index if not exists notification_states_user_id_idx
  on public.notification_states (user_id);

drop trigger if exists set_updated_at on public.notification_states;
create trigger set_updated_at before update on public.notification_states
  for each row execute function public.set_updated_at();

alter table public.notification_states enable row level security;

drop policy if exists "Users can view own notification states" on public.notification_states;
create policy "Users can view own notification states"
  on public.notification_states for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own notification states" on public.notification_states;
create policy "Users can insert own notification states"
  on public.notification_states for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own notification states" on public.notification_states;
create policy "Users can update own notification states"
  on public.notification_states for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete grant/policy - "Delete notification"/"Delete all read" are soft
-- deletes via deleted_at (BUSINESS_RULES.md "Soft Deletes"), matching every
-- other business entity. "Archive notification" is the distinct `status =
-- 'archived'` value `update` above already handles.
grant select, insert, update on public.notification_states to authenticated;
