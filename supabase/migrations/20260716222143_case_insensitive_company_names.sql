-- BUSINESS_RULES.md "Company Rules": "Companies are unique per user."
-- The original partial unique index (Phase 3) compared the raw `name`
-- column, which Postgres treats case-sensitively - "Google" and "google"
-- would have been allowed as two separate companies for the same user,
-- undermining the uniqueness rule and fragmenting per-company analytics.
-- Replaced with an index on lower(name) so uniqueness is case-insensitive,
-- matching the intent of the business rule.

drop index if exists public.companies_user_id_name_key;

create unique index if not exists companies_user_id_name_key
  on public.companies (user_id, lower(name))
  where deleted_at is null;
