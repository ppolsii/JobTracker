# DEPLOYMENT.md

Version: 1.0

---

# Purpose

This document defines how JobTracker Insights should be deployed.

The deployment process must be:

- Simple
- Reproducible
- Automated
- Low cost
- Production ready

The MVP must be deployable using only free services.

---

# Deployment Philosophy

The deployment should require the minimum amount of manual work.

Every push to the main branch should automatically deploy the application.

No manual server configuration should be required.

Infrastructure complexity should remain as low as possible.

---

# Infrastructure

Frontend

Next.js

↓

Hosting

Vercel

↓

Database

Supabase PostgreSQL

↓

Authentication

Supabase Auth

---

# Hosting

Provider

Vercel

Environment

Production

Requirements

Automatic deployments

Preview deployments

HTTPS enabled

Automatic SSL

---

# Database

Provider

Supabase

Environment

Production Project

Requirements

PostgreSQL

Authentication

Row Level Security

Automatic Backups (handled by Supabase)

---

# Repository

Provider

GitHub

Default Branch

main

Protected Branch

main

Development Branches

feature/*

fix/*

refactor/*

docs/*

---

# Deployment Flow

Developer

↓

Commit

↓

Push

↓

GitHub

↓

GitHub Actions

↓

Build

↓

Tests

↓

Deploy

↓

Vercel

↓

Production

---

# Continuous Integration

Every Pull Request should execute:

Type Checking

Linting

Build

Unit Tests

If any step fails

Deployment must stop.

---

# Continuous Deployment

Deploy automatically when:

Branch = main

Requirements

Build successful

Tests successful

Lint successful

TypeScript successful

---

Version 2, Phase 25: `.github/workflows/ci.yml` already enforces all four requirements above on every push/PR to `main` (confirmed - no gap found, no change needed). Connecting the GitHub repository to Vercel itself remains an outstanding, manual, dashboard-side step - it cannot be performed from this environment (no Vercel account/dashboard access exists here). This has been the status since Phase 18 (`KNOWN_ISSUES.md`) and is unchanged by this phase.

---

# Environment Variables

The following variables are required.

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

---

Required for billing (Version 2, Phase 23 infrastructure; Phase 38 production Checkout/Portal/webhooks)

SUPABASE_SERVICE_ROLE_KEY

Used only by `src/lib/supabase/admin.ts`, called only from `src/features/billing/repositories/billing-webhook.repository.ts` (the Stripe webhook's write path - see `ARCHITECTURE.md` "Repositories"). No other code path uses the Supabase Admin API or a service-role client; every other Supabase call goes through the anon/authenticated client, with Row Level Security as the actual enforcement. Never expose this key to the client.

STRIPE_SECRET_KEY

Used by `src/lib/stripe.ts` - the webhook Route Handler, and (Phase 38) `BillingCheckoutService` for creating Checkout Sessions and Customer Portal sessions. A `sk_test_...` key runs the application in Stripe Test Mode; a `sk_live_...` key runs it in Live Mode - this is the *only* thing that determines which mode the application runs in, no separate application setting exists.

STRIPE_WEBHOOK_SECRET

Used only by `src/lib/stripe.ts`, to verify that an incoming webhook request genuinely came from Stripe. Get this from the Stripe Dashboard's Webhooks page (or `stripe listen` for local development) - it is specific to each webhook endpoint you configure, so Test Mode and Live Mode each have their own value.

STRIPE_PRO_MONTHLY_PRICE_ID

STRIPE_PRO_YEARLY_PRICE_ID

Version 2, Phase 38. The Stripe Price ids for the Pro plan's two billing intervals ("STRIPE PRODUCTS": "Products and Prices must be configurable through environment variables. Never hardcode Price IDs.") - create one Product ("Pro") with two recurring Prices (Monthly, Yearly) in the Stripe Dashboard, then copy each Price's id (`price_...`) here. The Free plan has no Stripe product or price at all - it's this application's default, with no Checkout involved.

All five are read lazily (not required for the application to build or start) - only an actual Checkout/Portal attempt or a request to `/api/webhooks/stripe` depends on them.

---

Optional

NEXT_PUBLIC_APP_URL

Also used (Phase 38) to build Checkout's `success_url`/`cancel_url` and the Customer Portal's `return_url` - must be set to the application's real public URL in production (not the `localhost:3000` default) or Stripe will redirect users back to the wrong place after Checkout.

NODE_ENV

---

# Production Billing Setup (Version 2, Phase 38)

Complete, in-order steps to go from the code in this repository to real, working Stripe subscriptions:

1. **Create the Stripe objects.** In the Stripe Dashboard (Test Mode first): create one Product named "Pro," then add two recurring Prices under it - one Monthly, one Yearly. Copy each Price's id into `STRIPE_PRO_MONTHLY_PRICE_ID`/`STRIPE_PRO_YEARLY_PRICE_ID`.
2. **Configure the Customer Portal.** In the Stripe Dashboard's Billing → Customer Portal settings, enable: updating the payment method, viewing/downloading invoices, cancelling a subscription (at period end), and resuming a subscription scheduled to cancel. These are Stripe-hosted capabilities this application's Customer Portal button opens the door to - none of them are reimplemented in this codebase.
3. **Configure the webhook endpoint.** In the Stripe Dashboard's Webhooks page, add an endpoint pointing at `https://<your-domain>/api/webhooks/stripe`, and subscribe it to exactly these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.resumed`, `customer.subscription.paused`, `invoice.payment_succeeded`, `invoice.payment_failed`. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Set every environment variable above** in Vercel's Production environment (and, separately, Preview/Development if you want a working test flow there too - use Test Mode keys for those).
5. **Test the full flow in Test Mode** before ever switching to a live key: sign up, upgrade (using one of [Stripe's test card numbers](https://docs.stripe.com/testing)), confirm the Settings page reflects Pro immediately after being redirected back, then use Manage Subscription to cancel and confirm it reverts to Free at the period's end.
6. **Go live**: replace `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` with their Live Mode equivalents, and repeat steps 1-3 in Stripe's Live Mode (Test and Live Mode each have entirely separate Products/Prices/webhook endpoints - nothing carries over automatically).

No code change is required to switch between Test Mode and Live Mode - it is entirely a function of which Stripe key is configured ("TEST MODE": "Configuration entirely through environment variables").

---

# Secrets

Secrets must never be:

Committed

Logged

Hardcoded

Exposed to the client

Only public variables may begin with

NEXT_PUBLIC_

---

# Build Process

Install dependencies

↓

Type Check

↓

Lint

↓

Build

↓

Run Tests

↓

Deploy

If any step fails

Abort deployment.

---

# Node Version

Use the latest stable LTS version supported by Next.js.

The Node version should remain consistent between local development and production.

---

# Local Development

Requirements

Node.js

Git

VS Code

Supabase Project

Commands

Install dependencies

Run development server

Connect to Supabase

No Docker required for the MVP.

---

# Production Environment

Production should use:

Optimized Build

HTTPS

Compression

Caching

Server Components

Environment Variables

---

# Monitoring

The MVP should avoid external monitoring services.

Use:

Vercel Logs

Supabase Logs

Browser Console

Future versions may integrate external monitoring solutions.

Version 2, Phase 25: reviewed, per `IMPLEMENTATION_ORDER_V2.md`. No document names a specific vendor, and introducing one would mean a new paid dependency (`PROJECT_CONSTRAINTS.md`: "No paid APIs," costs "as close to €0/month as possible") requiring approval and real credentials this environment cannot obtain - deliberately deferred rather than guessed, per this phase's explicit "stop and ask" instruction. Vercel Logs/Supabase Logs/Browser Console remain the tooling until a specific vendor is chosen in a future phase.

Version 2, Phase 39 (Production Readiness Audit): added `src/lib/monitoring.ts` - a thin, vendor-agnostic facade (`captureException`/`captureMessage`/`trackEvent`) that only logs to the console today, with no new dependency and nothing to configure. Wiring up a real provider (Sentry, PostHog, Vercel Analytics/Speed Insights) once one is actually chosen means editing that one file's three function bodies, never any of its call sites. See `PRODUCTION_AUDIT_REPORT.md`.

---

# Error Reporting

Unexpected errors should be logged.

Business errors should be returned to the UI.

Sensitive information must never appear in logs.

---

# Database Migrations

Every schema change must be implemented using migrations.

Manual database modifications are forbidden.

Migration files belong inside:

supabase/migrations/

Every migration should be reversible whenever possible.

---

# Backup Strategy

Supabase manages database backups.

The application should not implement additional backup mechanisms.

---

# Recovery

If deployment fails

Rollback to previous successful deployment.

If migration fails

Stop deployment immediately.

Never continue after a failed migration.

---

# Performance Requirements

Production deployment should achieve:

Lighthouse Performance > 90

Accessibility > 90

Best Practices > 90

SEO > 90

---

# HTTPS

HTTPS is mandatory.

HTTP requests should automatically redirect to HTTPS.

Version 2, Phase 39 (Production Readiness Audit): `next.config.ts` now sends five security headers on every response - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` disabling unused browser features, and `Strict-Transport-Security` (reinforcing this section's own HTTPS requirement at the browser level). A Content-Security-Policy was deliberately not added - it needs verification in a real browser this environment cannot perform before it's safe to enable; a recommended starting policy is documented in `PRODUCTION_AUDIT_REPORT.md`.

---

# Domain

During development

Vercel Domain

Production

Custom Domain

The domain configuration is outside the MVP scope.

---

# File Storage

Version 2, Phase 40 (CV Library): supersedes this section's original text below - CV versions now hold a real uploaded PDF, so Supabase Storage is required. The migration `supabase/migrations/20260726090000_cv_file_storage.sql` creates and configures everything needed (the bucket itself and its RLS policy) - running migrations is the only setup step; nothing is configured by hand in the Supabase Dashboard.

Bucket

cv-files (private, 5 MB limit, PDF only)

Object key

`<user_id>/<cv_version_id>.pdf`

Access

Every download uses a short-lived signed URL, never a public bucket URL - see `DATABASE.md`'s "Storage" section.

Original MVP text (no longer current): "The MVP does not require file uploads. Supabase Storage should not be configured."

---

# CDN

Static assets should be served using Vercel CDN.

No external CDN is required.

---

# Caching

Use Next.js default caching strategy.

Avoid introducing Redis.

Avoid introducing external cache providers.

Caching should remain simple.

---

# Deployment Checklist

Before deployment verify:

✓ TypeScript passes

✓ Build passes

✓ Tests pass

✓ Environment variables configured

✓ Database migrations executed

✓ No console errors

✓ Authentication working

✓ RLS enabled

✓ HTTPS enabled

✓ Responsive UI verified

Version 2, Phase 39 (Production Readiness Audit): see `PRODUCTION_AUDIT_REPORT.md`'s own "Blocking Production" section for the complete, current list of what remains before real users are onboarded (configuring real Stripe/Supabase production credentials, connecting Vercel, the first live end-to-end verification, and a rate-limiting decision) - this checklist's items are all satisfied by the codebase itself; those five are operational steps outside what any code change can complete.

---

# Cost Philosophy

The deployment must respect PROJECT_CONSTRAINTS.md.

The MVP should operate using:

GitHub Free

Supabase Free

Vercel Free

No paid infrastructure should be required before monetisation.

---

# Future Deployment

Future versions may introduce:

Custom Domain

Monitoring

Analytics

Payments

Email Services

Object Storage

Background Workers

These services must not be implemented in the MVP.

---

# Claude Instructions

Deploy using the simplest possible infrastructure.

Do not introduce Docker.

Do not introduce Kubernetes.

Do not introduce Terraform.

Do not introduce AWS infrastructure.

Do not introduce unnecessary cloud services.

The deployment process should be understandable by a single developer.

The infrastructure should remain inexpensive, reliable and easy to maintain.

Respect all project constraints regarding operational costs.
