-- updated_at (DATABASE.md "Triggers")
-- CREATE OR REPLACE FUNCTION is already idempotent. Triggers are dropped and
-- recreated since CREATE TRIGGER has no IF NOT EXISTS in Postgres and this
-- file may be re-run by hand via the SQL Editor.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.companies;
create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.cv_versions;
create trigger set_updated_at before update on public.cv_versions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.applications;
create trigger set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.application_notes;
create trigger set_updated_at before update on public.application_notes
  for each row execute function public.set_updated_at();

-- Status History is the source of truth; current_status is a synchronised
-- cache, never written directly (ADR-017). This UPDATE re-checks
-- applications_date_required_after_wishlist_check, so any Service inserting
-- a transition out of Wishlist must set application_date in the same
-- transaction or this will raise a constraint violation by design.
create or replace function public.sync_current_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.applications
  set current_status = new.new_status
  where id = new.application_id;

  return new;
end;
$$;

drop trigger if exists sync_current_status on public.application_status_history;
create trigger sync_current_status
  after insert on public.application_status_history
  for each row execute function public.sync_current_status();

-- application_status_history is append-only: "Never update. Never delete."
-- (DATABASE.md). Enforced here in addition to RLS having no UPDATE/DELETE
-- policy, so the rule holds even for elevated database roles.
create or replace function public.prevent_status_history_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'application_status_history is append-only and cannot be updated or deleted';
end;
$$;

drop trigger if exists prevent_status_history_update on public.application_status_history;
create trigger prevent_status_history_update
  before update on public.application_status_history
  for each row execute function public.prevent_status_history_mutation();

drop trigger if exists prevent_status_history_delete on public.application_status_history;
create trigger prevent_status_history_delete
  before delete on public.application_status_history
  for each row execute function public.prevent_status_history_mutation();

-- Mirrors every new Supabase Auth user into public.users. SECURITY DEFINER
-- is required because regular users have no INSERT policy on public.users
-- (that row is only ever created by this trigger, never by client code).
-- full_name falls back to an empty string until Phase 4's registration form
-- supplies it via auth signup metadata. ON CONFLICT DO NOTHING makes the
-- trigger itself idempotent, not just this migration file.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
