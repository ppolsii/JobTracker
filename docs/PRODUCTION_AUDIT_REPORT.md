# Production Audit Report

Version 2, Phase 39 (Production Readiness Audit) - `IMPLEMENTATION_ORDER_V2.md`. Introduces no user-facing feature; verifies that the 38 phases before it are secure, performant, and maintainable, and fixes what could be fixed safely without redesigning anything.

Date: 2026-07-25

---

## How to read this report

Findings are ranked by severity, then by whether this phase already fixed them:

- **Critical** - would put user data, payments, or the whole app at risk. Must be resolved before real users.
- **High** - a real gap a production app should not ship without, but not an immediate compromise.
- **Medium** - worth doing, not urgent.
- **Low** - polish, consistency, or already-mitigated risk.

Every "Fixed this phase" item was applied directly (see `CHANGELOG.md` Phase 39 for the full list of files touched). Every "Not fixed - recommendation" item was deliberately left alone, per this phase's own "no new features, no redesign, no unnecessary refactoring" scope, and is recorded here (and in `KNOWN_ISSUES.md`) instead.

---

## Executive summary

This codebase is unusually disciplined for its size (39 phases, ~180 source files, 13 database tables). Every table has Row Level Security enabled; every RLS policy uses the `(select auth.uid())` performance pattern; every SQL view is `security_invoker`; every SECURITY DEFINER function pins `search_path`; no table has ever been granted to `anon`; no hard `DELETE` has ever been granted anywhere (soft-delete only, consistently); every Server Action authenticates before doing anything; no SQL injection surface exists (100% Supabase query builder, two `.rpc()` calls both parameterized); no secrets are logged; only one `dangerouslySetInnerHTML` call exists in the whole app, and it renders our own trusted JSON-LD data, never user input.

The one **critical-severity finding was a real, actionable Next.js vulnerability** (`next@16.2.10` was subject to several high-severity Server Actions/middleware CVEs) - resolved during this audit by upgrading to `16.2.11`, a safe patch release. Everything else found was High/Medium/Low - real gaps, but none that indicate broken or unsafe code as shipped.

**Nothing found blocks the code itself from being production-ready.** What remains before *launching* is almost entirely operational (configuring real Stripe/Supabase production accounts, connecting Vercel, deciding on a rate-limiting strategy) rather than a code defect - see "Blocking Production" at the end of this report.

---

## Critical

### [RESOLVED THIS PHASE] `next@16.2.10` had multiple high-severity CVEs

`npm audit` flagged `next` (our exact installed version) for: a middleware/proxy bypass in App Router + Turbopack, a Server Actions DoS, an SSRF in Server Actions on custom servers, response-body cache confusion (two related CVEs), an unbounded Server Action payload in the Edge runtime, an SSRF via rewrites, and **unauthenticated disclosure of internal Server Function endpoints** - the last one is particularly relevant here, since this app is built almost entirely on Server Actions.

**Fix applied:** upgraded `next` `16.2.10` -> `16.2.11` (the latest stable patch, not a major/breaking bump). Re-running `npm audit` after the upgrade shows none of these CVEs remain reachable - the only advisories left are transitive `postcss`/`sharp` (bundled inside Next's own tree, unfixable without Next.js itself updating them - `sharp` specifically backs Next's Image Optimization API, which this app never invokes since no page uses `next/image`) and `fast-uri`/`@hono/node-server` (reachable only through the `shadcn` CLI, now correctly reclassified as a `devDependency` - never bundled or executed in production).

Verified: `npm run typecheck`/`lint`/`test`/`build` all still pass on `16.2.11`.

---

## High Priority

### No rate limiting on any Server Action

**Not fixed - recommendation.** No middleware, edge config, or in-memory limiter exists anywhere in this codebase. Supabase Auth's own API has some baseline protection for `signInWithPassword`/`signUp`, but nothing protects this app's own Server Actions - most notably `requestPasswordResetAction` (could be used to spam a target's inbox with reset emails, even though it's already hardened against *email enumeration*) and `registerAction` (could be used to mass-create accounts). Checkout/Billing Portal session creation is auth-gated, which limits (but doesn't eliminate) abuse potential.

**Why not fixed now:** implementing real rate limiting needs new infrastructure (Upstash Redis + `@upstash/ratelimit`, Vercel's own KV/Edge Config, or similar) - a genuine new dependency and architecture decision this phase's "no new features, no redesign" scope correctly excludes. It also cannot be meaningfully tuned (request thresholds, windows) without a real deployment to observe traffic against.

**Recommendation:** add `@upstash/ratelimit` (or equivalent) scoped to exactly the auth/checkout Server Actions, as its own follow-up phase - not a code fix bundled into a "no new features" audit.

### End-to-end verification against a real Supabase project has never been performed

**Not fixed - recommendation, carried forward and enlarged.** This is the cumulative form of the "Real data not verified against a live database" entry recorded in `KNOWN_ISSUES.md` since Phase 4: no confirmed, reachable Supabase test account has existed in this environment across all 39 phases. Every RLS policy, every constraint, every Postgres function, and - as of Phase 38 - every Stripe webhook handler has been verified by code review and by tracing the implementation against its documented specification, never by executing the running application against a real backend.

**Recommendation:** before onboarding real users, manually run through: signup -> email confirmation -> login; creating a Company/CV Version/Application through a full status-history lifecycle; the Phase 38 Stripe flow end-to-end (Checkout in Test Mode -> webhook received -> Settings reflects Pro -> Customer Portal -> cancel -> reverts to Free at period end) using Stripe's test card numbers and either the Stripe CLI (`stripe listen`) or a real webhook endpoint.

### Content-Security-Policy not implemented

**Not fixed - recommendation.** Five safe, uncontroversial security headers were added this phase (see "Fixed This Phase" below), but a real CSP was deliberately left out. Next.js's own hydration/RSC payload scripts, this app's one legitimate `dangerouslySetInnerHTML` use (JSON-LD, which browsers exempt from `script-src` since its MIME type isn't executable), and Base UI's portal-based dialogs all need to keep working - getting a CSP wrong can silently break rendering, and this environment has no way to load the app in a real browser to confirm a policy doesn't regress anything before shipping it.

**Recommendation, to test in a real browser before enabling:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self' https://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

(`style-src 'unsafe-inline'` is likely needed for Tailwind/Base UI's inline style attributes unless verified otherwise; `connect-src` must allow the Supabase project's own domain for the browser client's requests.)

### Stripe production billing (Phase 38) has never been exercised against a real Stripe account

**Not fixed - recommendation.** Same root cause as the Supabase item above, specific to the newest, most operationally risky feature: Checkout Session creation, the Customer Portal, and all eight webhook event handlers were verified by extensive unit tests (Stripe fully mocked) and code review, never against Stripe's actual API. `DEPLOYMENT.md`'s "Production Billing Setup" walkthrough (added Phase 38) already documents the exact steps; they have not yet been performed.

---

## Medium Priority

### Several Services have no dedicated unit test file

`application-note.service.ts` (209 lines, real ownership-check branching via `ApplicationService.getById`), `application-stats.service.ts`, `dashboard.service.ts`, `application-picker.service.ts`, and `auth-browser.service.ts` have no test file. **Partially addressed this phase:** `application.service.ts` (391 lines, the single most central Service in the app - capacity gating, cross-table reference validation, Postgres constraint/FK-violation-to-friendly-message mapping) was the most significant gap and now has one (26 new tests). `cv-version.service.ts` remains deliberately untested (documented in `KNOWN_ISSUES.md` since Phase 17: it mirrors `company.service.ts` almost verbatim, so a dedicated test file would duplicate `company.service.test.ts` for no additional real coverage).

**Recommendation:** `application-note.service.ts` is the next-highest-value addition (real branching logic, not a thin passthrough); the other three are low-risk, mostly-delegation code where a test would mostly test the mock.

### Three schema columns exist but are never written

`applications.offer_salary`, `.rejection_reason`, `.response_date` are selected and even included in JSON/CSV export (always `null`), but no Service in any of the 39 phases ever writes to them - confirmed still true during this audit (first flagged in `KNOWN_ISSUES.md` at Phase 9). Not a bug against any documented requirement, just dead schema.

**Recommendation:** either wire them up (if a future phase adds richer status-change UI) or drop them in a future migration - not done now, since removing columns is a schema change with export/API-shape implications outside a "no new features" audit's scope.

### `env.ts` mixes public and server-only values in one object

`env.appUrl`/`supabaseUrl`/`supabaseAnonKey` (safe to reach a browser) and `stripeSecretKey`/`stripeWebhookSecret`/`supabaseServiceRoleKey`/the two Stripe Price ids (must never reach a browser) all live on the same `env` object. Verified safe in practice: no `"use client"` component anywhere imports `@/config/env` (confirmed by a full-codebase search), and Next.js's bundler would inline non-`NEXT_PUBLIC_` values as `undefined` in a client bundle even if one did. Still a defensive-structure smell worth avoiding as this list grows.

**Recommendation:** split into `publicEnv`/`serverEnv` in a future phase that's already touching `env.ts`, not as a standalone refactor.

---

## Low Priority

### [FIXED THIS PHASE] Three redundant single-column database indexes

`goals_user_id_idx`, `user_achievements_user_id_idx`, and `notification_states_user_id_idx` were each made redundant by a composite index/unique constraint on the same table sharing the same leading column (`goals_user_id_status_idx`, `unique(user_id, achievement_key)`, `unique(user_id, notification_key)` respectively) - a B-tree index on `(user_id, x)` already serves a `WHERE user_id = ...` query as well as a dedicated single-column index would. Dropped via a new migration (`20260725090000_audit_cleanup.sql`, never editing an already-shipped one, per this project's own convention).

### [FIXED THIS PHASE] `shadcn` was listed as a runtime dependency

It is a CLI-only tool (`npx shadcn add ...`), never imported by any application code (confirmed by a full-codebase search) - moved from `dependencies` to `devDependencies`. See "Dependencies" in `ARCHITECTURE.md` for the full rationale of every remaining runtime dependency.

### [FIXED THIS PHASE] Five routes had no `loading.tsx`

`/calendar`, `/goals`, `/notifications`, `/pricing` (dashboard), and `/search` - all Server Components doing real data fetching - had no Suspense fallback, unlike every route built through Phase 16 (which all consistently got one). Added, using the exact same one-line `<PageSkeleton />` pattern every existing `loading.tsx` in this codebase already uses. (`/analytics/advanced` was checked and does *not* need its own - it inherits `analytics/loading.tsx`'s Suspense boundary, since `analytics/` has no `layout.tsx` breaking that inheritance.)

### [FIXED THIS PHASE] No `error.tsx` or `not-found.tsx` existed anywhere

An unhandled exception in any route, or a genuinely missing URL, fell through to Next.js's generic default pages. Added a root `error.tsx` (a Client Component, per Next's own requirement, with a "Try again"/"Back to Dashboard" recovery path) and `not-found.tsx` - both apply app-wide since neither `(auth)`, `(dashboard)`, nor `(marketing)` defines a more specific override.

### [FIXED THIS PHASE] No security headers were set anywhere

Neither `next.config.ts` nor the proxy/middleware set any hardening header. Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` disabling unused browser features, and `Strict-Transport-Security`. (CSP deliberately excluded - see "High Priority" above.)

### [FIXED THIS PHASE] No monitoring/observability hooks existed

Added `src/lib/monitoring.ts`: `captureException`/`captureMessage`/`trackEvent`, a vendor-agnostic facade (console-based today, zero new dependencies) wired into the new `error.tsx` boundary. Swapping in a real provider (Sentry, PostHog, Vercel Analytics) later means editing this one file, never its call sites - see the file's own comments for exactly where each provider's real call would go.

### Color contrast and screen-reader behavior not independently verified

Same persistent limitation as every phase since Phase 5: no browser is reachable from this environment to visually confirm contrast ratios or run a real screen reader. Every icon-only button in the codebase does carry an `aria-label` (spot-checked across the whole `src/` tree - no file using an icon-only button was found missing one entirely), and every interactive primitive (Dialog/Sheet/AlertDialog/Accordion/Tooltip/Select) is Base UI, which handles focus trapping/restoration and keyboard navigation internally rather than this app reimplementing it. Tailwind/shadcn's default color tokens are designed for WCAG AA in both themes, but this has not been independently measured here.

### `KNOWN_ISSUES.md` was not updated between Phase 18 and this phase

Twenty phases of Version 2 work (Phases 19-38) added no entries to this file, even though several (documented resolutions, deliberate scope decisions) would have been natural additions. This phase corrected the two entries that had gone factually stale (`SUPABASE_SERVICE_ROLE_KEY remains unused` - false since Phase 23/38; the `postcss` advisory note - now also covers `sharp`, and a new `shadcn`-only advisory) and added its own new entries, but did not attempt a full retroactive backfill of Phases 19-38 (a large undertaking outside this audit's actual scope).

**Recommendation:** keep `KNOWN_ISSUES.md` updated incrementally, phase by phase, going forward - the gap only exists because that discipline lapsed partway through Version 2, not because the file stopped being useful.

---

## Recommendations (not urgent)

1. Run `supabase gen types typescript` once a real, connected Supabase project exists, to replace the hand-authored `src/types/supabase.ts` with the authoritative generator output (`KNOWN_ISSUES.md`, open since Phase 3).
2. Consider Playwright (or similar) for end-to-end tests once a stable, reachable test environment exists (`KNOWN_ISSUES.md`, open since Phase 17) - this audit's own unit-test additions are a complement to, not a replacement for, real browser-driven E2E coverage.
3. Wire a real Sentry/PostHog/Vercel Analytics provider into `src/lib/monitoring.ts`'s three functions once accounts/DSNs exist.
4. Consider `next/dynamic` for any component found to meaningfully bloat a single route's bundle once real bundle-analyzer output exists - not attempted here, since Next's own automatic per-route code-splitting already covers the common case, and picking components to lazy-load without a way to visually verify no loading-flash/layout-shift regression is introduced would be guessing.

---

## Blocking Production

Nothing in the application's own code blocks a deploy. What remains is operational, not a defect:

1. **Configure real Stripe products, prices, webhook endpoint, and Customer Portal settings** per `DEPLOYMENT.md`'s "Production Billing Setup" (Phase 38) - billing does not function until this is done.
2. **Set every environment variable** `DEPLOYMENT.md` documents as required, in the real hosting environment - most importantly `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, and the two `STRIPE_PRO_*_PRICE_ID` variables, none of which have a safe default.
3. **Connect the GitHub repository to Vercel** - a manual, dashboard-side step that cannot be performed from this environment (known since Phase 18).
4. **Perform the first live end-to-end verification** (signup through email confirmation, a full application lifecycle, and the complete Stripe Checkout -> webhook -> entitlement round trip) before onboarding real users - see "High Priority" above.
5. **Decide on and implement a rate-limiting strategy** for the auth and checkout Server Actions before the app is exposed to public, unauthenticated traffic at any real scale.

None of these are code changes this phase could safely make on its own - each needs either real third-party credentials this environment doesn't have, or a product/infrastructure decision (which rate limiter, which CSP) that deserves its own scoped follow-up rather than being bundled into an audit.
