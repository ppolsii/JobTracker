-- Production Readiness Audit (IMPLEMENTATION_ORDER_V2.md Phase 39) -
-- database review. No schema/behavior change - purely removes indexes made
-- redundant by a composite index/unique constraint sharing the same
-- leading column, which already serves single-column lookups on that
-- column equally well. A new migration, per this project's own convention
-- of never editing an already-shipped one.

-- goals_user_id_status_idx (user_id, status) already serves any query
-- filtering on user_id alone.
drop index if exists public.goals_user_id_idx;

-- The unique(user_id, achievement_key) constraint's own index already
-- serves any query filtering on user_id alone.
drop index if exists public.user_achievements_user_id_idx;

-- The unique(user_id, notification_key) constraint's own index already
-- serves any query filtering on user_id alone.
drop index if exists public.notification_states_user_id_idx;
