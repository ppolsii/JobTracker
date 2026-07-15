-- Enums (DATABASE.md "Enums")
-- Wrapped in guards: CREATE TYPE has no IF NOT EXISTS in Postgres, and this
-- file may be re-run by hand via the SQL Editor.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'work_mode' and typnamespace = 'public'::regnamespace
  ) then
    create type public.work_mode as enum ('Remote', 'Hybrid', 'On Site');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'employment_type' and typnamespace = 'public'::regnamespace
  ) then
    create type public.employment_type as enum (
      'Full Time',
      'Part Time',
      'Internship',
      'Contract',
      'Freelance'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'application_status' and typnamespace = 'public'::regnamespace
  ) then
    create type public.application_status as enum (
      'Wishlist',
      'Applied',
      'Recruiter Contact',
      'HR Interview',
      'Technical Interview',
      'Final Interview',
      'Offer',
      'Accepted',
      'Rejected'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'application_source' and typnamespace = 'public'::regnamespace
  ) then
    create type public.application_source as enum (
      'LinkedIn',
      'Indeed',
      'Referral',
      'Company Website',
      'Recruiter',
      'Other'
    );
  end if;
end
$$;

-- users
-- Mirrors auth.users (id) so the app never queries the auth schema directly.
-- Populated by the handle_new_user trigger defined in the next migration.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  website text,
  industry text,
  size text,
  country text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Required so applications can enforce cross-table ownership below
  -- (composite foreign key), not just existence of the referenced row.
  unique (id, user_id)
);

-- "Companies are unique per user" (BUSINESS_RULES.md). Scoped to active
-- rows only, so a company name can be reused after the original is archived.
create unique index if not exists companies_user_id_name_key
  on public.companies (user_id, name)
  where deleted_at is null;

-- Needed for unfiltered "all of a user's companies" queries (e.g. export),
-- which the partial index above cannot serve since it excludes archived rows.
create index if not exists companies_user_id_idx on public.companies (user_id);

-- cv_versions
create table if not exists public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create unique index if not exists cv_versions_user_id_name_key
  on public.cv_versions (user_id, name)
  where deleted_at is null;

create index if not exists cv_versions_user_id_idx on public.cv_versions (user_id);

-- applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_id uuid not null,
  cv_version_id uuid not null,
  position text not null,
  job_url text,
  location text,
  work_mode public.work_mode,
  employment_type public.employment_type,
  source public.application_source,
  salary_min integer,
  salary_max integer,
  currency text not null default 'EUR',
  -- Nullable: a Wishlist-stage application has not been submitted yet and
  -- therefore has no application date. Required once the application moves
  -- past Wishlist (enforced below and by the Service layer in a later phase).
  application_date date,
  -- Cached value, source of truth is application_status_history.
  -- Synchronised automatically by trigger (ADR-017) - never written directly.
  current_status public.application_status not null default 'Wishlist',
  response_date date,
  offer_salary integer,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Composite FKs ensure company_id/cv_version_id belong to the same user_id
  -- as the application, not merely that the referenced row exists. No ON
  -- DELETE clause (defaults to NO ACTION): BUSINESS_RULES.md prefers
  -- preventing deletion of a company/CV that is still referenced.
  constraint applications_company_owner_fk
    foreign key (company_id, user_id) references public.companies (id, user_id),
  constraint applications_cv_version_owner_fk
    foreign key (cv_version_id, user_id) references public.cv_versions (id, user_id),
  constraint applications_salary_range_check
    check (salary_min is null or salary_max is null or salary_min <= salary_max),
  constraint applications_date_not_future_check
    check (application_date is null or application_date <= current_date),
  constraint applications_date_required_after_wishlist_check
    check (current_status = 'Wishlist' or application_date is not null)
);

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_company_id_idx on public.applications (company_id);
create index if not exists applications_application_date_idx on public.applications (application_date);
create index if not exists applications_current_status_idx on public.applications (current_status);
create index if not exists applications_source_idx on public.applications (source);
create index if not exists applications_cv_version_id_idx on public.applications (cv_version_id);

-- application_status_history
-- Source of truth for an application's lifecycle. Append-only (enforced by
-- trigger in the next migration and by RLS having no UPDATE/DELETE policy).
create table if not exists public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  previous_status public.application_status,
  new_status public.application_status not null,
  changed_at timestamptz not null default now(),
  created_by uuid not null references public.users (id)
);

create index if not exists application_status_history_application_id_idx
  on public.application_status_history (application_id);
create index if not exists application_status_history_changed_at_idx
  on public.application_status_history (changed_at);

-- At most one "genesis" row (previous_status is null) per application, so
-- the lifecycle can never be corrupted with two disconnected starting points.
create unique index if not exists application_status_history_one_genesis_idx
  on public.application_status_history (application_id)
  where previous_status is null;

-- application_notes
create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists application_notes_application_id_idx
  on public.application_notes (application_id);

-- Explicit grants so these migrations are self-contained and reproducible
-- against a fresh Supabase project rather than relying on implicit
-- dashboard-configured default privileges (ADR-029 reusability). RLS still
-- governs row-level access; these only grant table-level access. No DELETE
-- is granted anywhere - every entity is soft-deleted via UPDATE.
grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.companies to authenticated;
grant select, insert, update on public.cv_versions to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert on public.application_status_history to authenticated;
grant select, insert, update on public.application_notes to authenticated;
