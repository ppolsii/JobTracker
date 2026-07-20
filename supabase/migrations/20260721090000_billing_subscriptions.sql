-- Billing infrastructure: subscription data model (IMPLEMENTATION_ORDER_V2.md
-- Phase 23). Establishes where plan state will live. Nothing reads this
-- table to gate a feature yet (Phase 24's job), and the `plan` column is
-- never written by this phase beyond its default - only `status`,
-- `stripe_customer_id`, `stripe_subscription_id` and `current_period_end`
-- are ever touched here, mirroring Stripe's own webhook payload as-is.
-- Every user gets a `free` row automatically (extends handle_new_user, the
-- same trigger that already mirrors auth.users into public.users), so no
-- future phase needs a create-if-missing read path.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'subscription_plan' and typnamespace = 'public'::regnamespace
  ) then
    create type public.subscription_plan as enum ('free', 'pro');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'subscription_status' and typnamespace = 'public'::regnamespace
  ) then
    -- Mirrors Stripe's own Subscription.status values exactly (mechanical
    -- pass-through, not a reinterpretation) - see BillingWebhookService.
    create type public.subscription_status as enum (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    );
  end if;
end
$$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (stripe_customer_id),
  unique (stripe_subscription_id)
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);

drop trigger if exists set_updated_at on public.subscriptions;
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS: read-only for the owning user. No INSERT/UPDATE/DELETE policy or
-- grant exists for `authenticated` - a user must never be able to set
-- their own plan/status directly, mirroring applications.current_status's
-- "never manually edited" precedent. The only writers are handle_new_user
-- (the genesis row, below) and the billing webhook (app/api/webhooks/stripe),
-- which uses the service-role client precisely because no RLS policy could
-- safely allow that write - Stripe's signature verification is that
-- request's authentication, and RLS has no way to check it.
alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (user_id = (select auth.uid()));

grant select on public.subscriptions to authenticated;

-- Extends the existing signup-mirroring trigger (Phase 3) with a second
-- insert, the same multi-insert-in-one-function shape already established
-- by create_application_with_genesis (Phase 20). ON CONFLICT DO NOTHING
-- keeps this idempotent for the same reason the users insert already is.
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

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
