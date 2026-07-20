-- FEATURES.md Feature 4 validation: "CV names must be unique per user."
-- The original partial unique index (Phase 3) compared the raw `name`
-- column, which Postgres treats case-sensitively - "Backend" and "backend"
-- would have been allowed as two separate CV versions for the same user,
-- undermining the uniqueness rule and fragmenting per-CV analytics.
-- Replaced with an index on lower(name) so uniqueness is case-insensitive,
-- matching the intent of the business rule (and mirroring the equivalent
-- fix applied to companies in Phase 6).

drop index if exists public.cv_versions_user_id_name_key;

create unique index if not exists cv_versions_user_id_name_key
  on public.cv_versions (user_id, lower(name))
  where deleted_at is null;
