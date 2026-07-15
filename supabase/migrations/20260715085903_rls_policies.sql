-- Row Level Security (DATABASE.md "Row Level Security", ADR-005)
-- Every table is user-owned, directly or via its parent application.
-- No DELETE policy exists anywhere: entities are soft-deleted via UPDATE
-- (BUSINESS_RULES.md "Soft Deletes"), and application_status_history has
-- no UPDATE/DELETE policy at all because it is append-only.
--
-- auth.uid() is wrapped as (select auth.uid()) throughout: this lets
-- Postgres evaluate it once per statement (as an initPlan) instead of
-- once per row, which materially matters on larger tables. This is
-- Supabase's own documented RLS performance recommendation.
--
-- CREATE POLICY has no IF NOT EXISTS in Postgres, so every policy is
-- dropped and recreated - this file may be re-run by hand via the SQL Editor.

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.cv_versions enable row level security;
alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
alter table public.application_notes enable row level security;

-- users

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  using (id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- companies

drop policy if exists "Users can view own companies" on public.companies;
create policy "Users can view own companies"
  on public.companies for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own companies" on public.companies;
create policy "Users can insert own companies"
  on public.companies for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own companies" on public.companies;
create policy "Users can update own companies"
  on public.companies for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- cv_versions

drop policy if exists "Users can view own cv versions" on public.cv_versions;
create policy "Users can view own cv versions"
  on public.cv_versions for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own cv versions" on public.cv_versions;
create policy "Users can insert own cv versions"
  on public.cv_versions for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own cv versions" on public.cv_versions;
create policy "Users can update own cv versions"
  on public.cv_versions for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- applications

drop policy if exists "Users can view own applications" on public.applications;
create policy "Users can view own applications"
  on public.applications for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own applications" on public.applications;
create policy "Users can insert own applications"
  on public.applications for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications"
  on public.applications for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- application_status_history (ownership inherited via application_id)

drop policy if exists "Users can view own application status history" on public.application_status_history;
create policy "Users can view own application status history"
  on public.application_status_history for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_status_history.application_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert own application status history" on public.application_status_history;
create policy "Users can insert own application status history"
  on public.application_status_history for insert
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.applications a
      where a.id = application_status_history.application_id
        and a.user_id = (select auth.uid())
    )
  );

-- application_notes (ownership inherited via application_id)

drop policy if exists "Users can view own application notes" on public.application_notes;
create policy "Users can view own application notes"
  on public.application_notes for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert own application notes" on public.application_notes;
create policy "Users can insert own application notes"
  on public.application_notes for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update own application notes" on public.application_notes;
create policy "Users can update own application notes"
  on public.application_notes for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_notes.application_id
        and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );
