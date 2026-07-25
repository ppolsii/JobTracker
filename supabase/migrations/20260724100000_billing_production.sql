-- Production Billing (IMPLEMENTATION_ORDER_V2.md Phase 38). Extends the
-- Phase 23 `subscriptions` table with the remaining fields production
-- billing needs - "Never duplicate data already managed elsewhere":
-- `plan`/`status`/`stripe_customer_id`/`stripe_subscription_id`/
-- `current_period_end` (the "Renewal Date") already exist and are reused
-- as-is; only `billing_interval`, `cancel_at` ("Cancellation Date"), and
-- `latest_invoice_id` are genuinely new.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'subscription_billing_interval' and typnamespace = 'public'::regnamespace
  ) then
    -- Mirrors Stripe's own Price.recurring.interval values, scoped to the
    -- two intervals this application actually sells (Pro Monthly/Yearly) -
    -- not the full Stripe enum (which also includes 'week'/'day').
    create type public.subscription_billing_interval as enum ('month', 'year');
  end if;
end
$$;

alter table public.subscriptions
  add column if not exists billing_interval public.subscription_billing_interval,
  add column if not exists cancel_at timestamptz,
  add column if not exists latest_invoice_id text;

-- Webhook idempotency log (`BillingWebhookService`'s only reader/writer,
-- via the service-role client - Stripe's request carries no Supabase
-- session, same reasoning as `subscriptions`' own admin-only write path).
-- Recording an event's id after it has been successfully processed lets a
-- genuine Stripe retry (duplicate delivery) be recognized and skipped,
-- while a failed attempt (never recorded) remains retryable.
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- No policy, no grant to `authenticated` - this table holds no user data
-- and only the service-role client (which bypasses RLS) ever touches it.
