-- Calendar & Timeline (IMPLEMENTATION_ORDER_V2.md Phase 34). Custom events
-- and reminders a user creates directly - every other calendar event type
-- (Application submitted, Recruiter Contact, Interview, Technical Interview,
-- Final Interview, Offer received/accepted/rejected) is derived entirely
-- from the existing application_status_history table at read time, not
-- stored here (no duplicated business logic - see CalendarService).
-- Ownership is stored directly on user_id (unlike application_notes, which
-- has no user_id of its own) - the same pattern interview_feedback (Phase
-- 30) already established for an optional link back to an application.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'calendar_event_type' and typnamespace = 'public'::regnamespace
  ) then
    create type public.calendar_event_type as enum ('reminder', 'custom');
  end if;
end
$$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Nullable: "Optional Application" - a reminder/custom event may stand on
  -- its own (e.g. "Portfolio update") or be tied to a specific application
  -- (e.g. "Follow-up reminder" for a pending application).
  application_id uuid references public.applications (id) on delete cascade,
  type public.calendar_event_type not null default 'custom',
  title text not null,
  description text,
  event_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists calendar_events_user_id_idx
  on public.calendar_events (user_id);
create index if not exists calendar_events_application_id_idx
  on public.calendar_events (application_id);
create index if not exists calendar_events_event_date_idx
  on public.calendar_events (event_date);

drop trigger if exists set_updated_at on public.calendar_events;
create trigger set_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- Row Level Security (mirrors interview_feedback's hybrid shape: its own
-- user_id, plus an ownership check on the optional application_id link).
alter table public.calendar_events enable row level security;

drop policy if exists "Users can view own calendar events" on public.calendar_events;
create policy "Users can view own calendar events"
  on public.calendar_events for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own calendar events" on public.calendar_events;
create policy "Users can insert own calendar events"
  on public.calendar_events for insert
  with check (
    user_id = (select auth.uid())
    and (
      application_id is null
      or exists (
        select 1 from public.applications a
        where a.id = calendar_events.application_id
          and a.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can update own calendar events" on public.calendar_events;
create policy "Users can update own calendar events"
  on public.calendar_events for update
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      application_id is null
      or exists (
        select 1 from public.applications a
        where a.id = calendar_events.application_id
          and a.user_id = (select auth.uid())
      )
    )
  );

grant select, insert, update on public.calendar_events to authenticated;
