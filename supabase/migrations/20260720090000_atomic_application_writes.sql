-- Atomic multi-statement writes (IMPLEMENTATION_ORDER_V2.md Phase 20).
-- KNOWN_ISSUES.md documented two non-atomic write sequences: an
-- application's genesis status-history row was inserted in a second,
-- separate statement after the application itself (Phase 8), and leaving
-- Wishlist without a date wrote the date and the transition row as two
-- separate statements (Phase 9). The two functions below exist ONLY to
-- guarantee these already-approved writes happen inside a single
-- transaction - they contain no validation and no business rules. Which
-- transitions are allowed and whether a date is required continues to be
-- decided entirely by ApplicationStatusService before either function is
-- called. Both run SECURITY INVOKER (the default - not declared here,
-- matching this file's existing convention of only handle_new_user needing
-- SECURITY DEFINER), so RLS continues to enforce ownership exactly as it
-- does for every other insert/update in this schema.

create or replace function public.create_application_with_genesis(
  p_user_id uuid,
  p_company_id uuid,
  p_cv_version_id uuid,
  p_position text,
  p_application_date date,
  p_job_url text,
  p_location text,
  p_work_mode public.work_mode,
  p_employment_type public.employment_type,
  p_source public.application_source,
  p_salary_min integer,
  p_salary_max integer,
  p_currency text
)
returns public.applications
language plpgsql
set search_path = public
as $$
declare
  v_application public.applications;
begin
  insert into public.applications (
    user_id, company_id, cv_version_id, position, application_date,
    job_url, location, work_mode, employment_type, source,
    salary_min, salary_max, currency
  )
  values (
    p_user_id, p_company_id, p_cv_version_id, p_position, p_application_date,
    p_job_url, p_location, p_work_mode, p_employment_type, p_source,
    p_salary_min, p_salary_max, p_currency
  )
  returning * into v_application;

  insert into public.application_status_history (
    application_id, previous_status, new_status, created_by
  )
  values (v_application.id, null, 'Wishlist', p_user_id);

  return v_application;
end;
$$;

revoke all on function public.create_application_with_genesis(
  uuid, uuid, uuid, text, date, text, text, public.work_mode,
  public.employment_type, public.application_source, integer, integer, text
) from public;
grant execute on function public.create_application_with_genesis(
  uuid, uuid, uuid, text, date, text, text, public.work_mode,
  public.employment_type, public.application_source, integer, integer, text
) to authenticated;

-- Wraps Phase 9's two-write sequence (optional application_date update,
-- then the status_history insert) in one transaction. previous_status is
-- passed in rather than re-derived here, so this function makes no
-- independent judgement about the application's state - it only performs
-- the writes ApplicationStatusService has already decided are valid. The
-- existing sync_current_status trigger (Phase 3) still fires on the history
-- insert and updates applications.current_status exactly as it always has.
create or replace function public.transition_application_status(
  p_user_id uuid,
  p_application_id uuid,
  p_previous_status public.application_status,
  p_new_status public.application_status,
  p_application_date date
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_application_date is not null then
    update public.applications
    set application_date = p_application_date
    where id = p_application_id
      and user_id = p_user_id
      and deleted_at is null;
  end if;

  insert into public.application_status_history (
    application_id, previous_status, new_status, created_by
  )
  values (p_application_id, p_previous_status, p_new_status, p_user_id);
end;
$$;

revoke all on function public.transition_application_status(
  uuid, uuid, public.application_status, public.application_status, date
) from public;
grant execute on function public.transition_application_status(
  uuid, uuid, public.application_status, public.application_status, date
) to authenticated;
