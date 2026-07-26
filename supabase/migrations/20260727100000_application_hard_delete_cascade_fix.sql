-- Bug fix: Permanent Application Deletion (migration
-- 20260727090000_application_hard_delete.sql) always failed. `applications`
-- cascades on delete to `application_status_history`, which has had a
-- BEFORE DELETE trigger since Phase 3 (`prevent_status_history_delete`)
-- that unconditionally raises an exception - "application_status_history
-- is append-only and cannot be updated or deleted." That trigger fires for
-- ANY deletion of a row in that table, including one caused by a CASCADE
-- from deleting the parent application - Postgres does not distinguish "a
-- client tried to delete this row" from "this row is being removed because
-- its parent was permanently deleted." The cascade therefore always hit
-- the trigger, which aborted the entire `DELETE FROM applications`
-- statement.
--
-- Fix: a transaction-scoped flag (`set_config(..., is_local => true)`,
-- reset automatically at transaction end) that the trigger checks - set
-- only by the one function below, so the append-only guard still fully
-- blocks every other path (a client attempting to delete a status-history
-- row directly, or any future code that deletes `applications` without
-- going through this function) exactly as before. Only DELETE is ever
-- bypassed, and only via this flag - the sibling UPDATE trigger
-- (prevent_status_history_update) is untouched, since TG_OP is checked
-- explicitly.
create or replace function public.prevent_status_history_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' and current_setting('app.cascading_application_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'application_status_history is append-only and cannot be updated or deleted';
end;
$$;

-- The only path allowed to permanently delete an application (mirrors
-- create_application_with_genesis/transition_application_status: SECURITY
-- INVOKER, the default - not declared here - so RLS on `applications`
-- still enforces ownership exactly as it does for every other write).
-- "Must already be archived" remains ApplicationService.deletePermanently's
-- own business rule, checked before this is ever called - this function
-- makes no such decision itself, it only performs the one write and lets
-- existing FKs cascade.
create or replace function public.delete_application_permanently(
  p_user_id uuid,
  p_application_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.cascading_application_delete', 'on', true);

  delete from public.applications
  where id = p_application_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.delete_application_permanently(uuid, uuid) from public;
grant execute on function public.delete_application_permanently(uuid, uuid) to authenticated;
