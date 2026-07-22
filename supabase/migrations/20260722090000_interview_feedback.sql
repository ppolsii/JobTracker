-- Interview Feedback (IMPLEMENTATION_ORDER_V2.md Phase 30). Lets a user
-- attach structured feedback to a specific application_status_history row.
-- Ownership is stored directly on user_id (unlike application_notes, which
-- has no user_id of its own) - the same pattern applications/companies/
-- cv_versions already use - but every write must also confirm the target
-- application_status_history row belongs to an application owned by that
-- same user, enforced below in the RLS policies (defense in depth on top of
-- InterviewFeedbackService's own check via ApplicationStatusService).

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'interview_format' and typnamespace = 'public'::regnamespace
  ) then
    create type public.interview_format as enum (
      'Phone',
      'Video',
      'On-site',
      'Technical',
      'Behavioral'
    );
  end if;
end
$$;

create table if not exists public.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  application_status_history_id uuid not null references public.application_status_history (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  -- 1-5 scale (no document defines one; approved by the user during Phase 30
  -- planning). Nullable: a user may want to leave notes without rating.
  rating integer,
  format public.interview_format,
  -- Mirrors application_notes.content: required, free text, Markdown
  -- supported (BUSINESS_RULES.md "Notes"), no rich text.
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint interview_feedback_rating_range_check
    check (rating is null or (rating between 1 and 5))
);

create index if not exists interview_feedback_history_id_idx
  on public.interview_feedback (application_status_history_id);
create index if not exists interview_feedback_user_id_idx
  on public.interview_feedback (user_id);

drop trigger if exists set_updated_at on public.interview_feedback;
create trigger set_updated_at before update on public.interview_feedback
  for each row execute function public.set_updated_at();

-- Row Level Security (mirrors application_notes' "ownership inherited via
-- application_id" shape, one hop further through application_status_history).
alter table public.interview_feedback enable row level security;

drop policy if exists "Users can view own interview feedback" on public.interview_feedback;
create policy "Users can view own interview feedback"
  on public.interview_feedback for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own interview feedback" on public.interview_feedback;
create policy "Users can insert own interview feedback"
  on public.interview_feedback for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.application_status_history h
      join public.applications a on a.id = h.application_id
      where h.id = interview_feedback.application_status_history_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update own interview feedback" on public.interview_feedback;
create policy "Users can update own interview feedback"
  on public.interview_feedback for update
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.application_status_history h
      join public.applications a on a.id = h.application_id
      where h.id = interview_feedback.application_status_history_id
        and a.user_id = (select auth.uid())
    )
  );

grant select, insert, update on public.interview_feedback to authenticated;
