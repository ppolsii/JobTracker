# IMPLEMENTATION_ORDER_V2.md

Version: 2.0 — extends `IMPLEMENTATION_ORDER.md` (MVP, Phases 1–18)

---

# Purpose

This document defines the mandatory implementation order for JobTracker Insights Version 2, continuing the numbering established by the MVP's `IMPLEMENTATION_ORDER.md`.

Claude MUST follow this order unless explicitly instructed otherwise.

Every phase introduces **at most one new architectural pattern or one new feature** — never both, and never more than one of either. This is a deliberate departure in granularity from how some MVP phases were scoped, specifically to keep every V2 phase independently reviewable and revertible.

Do not skip phases. Do not implement future phases before completing the current one. Do not combine two phases below into one implementation session, even if they appear related.

---

# General Principles

Every phase must produce a working, deployable application.

Every phase must preserve `ARCHITECTURE.md`'s existing layering (UI → Server Action → Service → Repository → Supabase) unless the phase's explicit, sole purpose is to extend that architecture (Phases 23, 39, 44 are the only three phases permitted to introduce a new architectural pattern — a Route Handler, a service-role client, and API-key authentication, respectively — and each does so in isolation, on its own phase, touching no unrelated feature).

Every new business rule must be added to `BUSINESS_RULES.md` in the same phase that implements it — never inferred implicitly by the code.

Every new table or column must follow `DATABASE.md`'s existing conventions (`snake_case`, UUID primary keys, `created_at`/`updated_at`/`deleted_at` on business tables, RLS enabled) and must be additive only, per `DATABASE.md`'s own "Future Compatibility" mandate — no phase in this roadmap modifies or removes an existing MVP column, table, or constraint.

Every completed phase should be committed before starting the next one.

---

# Phase 19 — V2 Readiness (Pre-Flight Cleanup)

**Goal**
Close pre-existing MVP technical debt and confirm a stable, fully compliant baseline before any Version 2 feature work begins. This phase adds no new capability.

**Features included**
None (technical debt closure only).

**Files likely to be affected**
`src/shared/components/layout/TopNav.tsx` (remove direct `@/features/export`, `@/features/search` imports; accept `search`/`exportMenu` as `ReactNode` props, mirroring the existing `footer`/`userMenu` pattern); the dashboard layout that composes `TopNav` (now passes the two new props).

**Database changes**
None.

**Documentation updates required**
`KNOWN_ISSUES.md` — remove/resolve the `TopNav` architecture-regression entry once fixed. `CHANGELOG.md` — new "Version 2" section header introduced here.

**Dependencies on previous phases**
None — this is the first V2 phase, gating everything after it.

**Estimated complexity**
Low.

---

# Phase 20 — Atomic Writes Foundation (Postgres RPC)

**Goal**
Introduce the project's first Postgres RPC function pattern, applied narrowly to the two existing, already-documented non-atomic write sequences (application genesis-status insert; Wishlist-exit date-then-transition write). No new feature behavior — a hardening of existing rules only.

**Features included**
None new — resolves `KNOWN_ISSUES.md` Phase 8 and Phase 9 non-atomicity entries.

**Files likely to be affected**
New migration file; `ApplicationService.create`; `ApplicationStatusService.changeStatus`; `ApplicationRepository`/`ApplicationStatusHistoryRepository` (new RPC-wrapping methods replacing the current sequential-call methods).

**Database changes**
New Postgres function(s) (e.g. one wrapping the application + genesis-history insert, one wrapping the date-update + transition-insert). No table/column changes.

**Documentation updates required**
`DATABASE.md` (document the new function(s) under a new "Functions" subsection); `ARCHITECTURE.md` (document Postgres RPC as an approved Repository-layer mechanism, explicitly scoped to atomic multi-statement writes, not business logic); `KNOWN_ISSUES.md` (remove the two resolved entries); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Medium.

---

# Phase 21 — Analytics SQL Views

**Goal**
Move Analytics aggregation from in-memory bulk-read-and-reduce to SQL views, executing the views `DATABASE.md` already reserves by name. No change to any Analytics formula or output shape.

**Features included**
None new — a performance refactor of the existing Analytics feature.

**Files likely to be affected**
New migration file (views); `AnalyticsService` (queries views instead of raw tables); `AnalyticsRepository` (new/updated query methods).

**Database changes**
New read-only views: `dashboard_metrics`, `cv_statistics`, `company_statistics`, `monthly_statistics`.

**Documentation updates required**
`DATABASE.md` ("Views" section moves from "reserved for future versions" to implemented, with each view's purpose documented); `KNOWN_ISSUES.md` (remove the Phase 12 "in-memory aggregation" entry); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19. Independent of Phase 20 (may be implemented in either order relative to it, but not concurrently with it).

**Estimated complexity**
Medium.

---

# Phase 22 — Composite-FK Embedded-Query Verification

**Goal**
Verify, against a real confirmed Supabase account and dataset, whether `ApplicationRepository.list`'s embedded `companies!inner/cv_versions!inner` select correctly resolves through the composite ownership FKs. Apply the already-documented fallback only if verification fails.

**Features included**
None — verification and, conditionally, a persistence-layer correction.

**Files likely to be affected**
`ApplicationRepository.list`; `ApplicationService.list` (only if the fallback path is required).

**Database changes**
None.

**Documentation updates required**
`KNOWN_ISSUES.md` — either confirm resolved, or document the fallback taken and its consequence (client-side sort-by-name caveat) explicitly.

**Dependencies on previous phases**
Phase 19. This phase has an external dependency the project has never had reliably available (a real, confirmed test account) — it should be run opportunistically whenever that becomes available, and does not block any subsequent phase's start.

**Estimated complexity**
Low if confirmed working; Medium if the fallback must be implemented.

---

# Phase 23 — Billing Infrastructure & Subscription Data Model

**Goal**
Introduce the project's first Route Handler and its first external paid-service dependency, and establish the subscription data model. This phase does **not** gate any existing feature yet — it only makes plan state knowable.

**Features included**
Billing infrastructure half of the V2 spec's "Billing & Plan Gating" feature.

**Files likely to be affected**
New `app/api/webhooks/stripe/route.ts`; new `src/features/billing/{repositories,services,schemas,types}`; new `lib/stripe.ts` (thin client wrapper — infrastructure, not business logic); new migration file.

**Database changes**
New `subscriptions` table (`user_id` FK, `plan`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, timestamps, RLS by `user_id`).

**Documentation updates required**
`DATABASE.md` (new table); `ARCHITECTURE.md` (document Route Handlers as a now-approved second entry-point pattern, explicitly scoped to external-service webhook receivers, not general request handling); `DEPLOYMENT.md` (new required Stripe environment variables); `BUSINESS_RULES.md` (draft the new plan-based rule section, not yet enforced anywhere); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
High.

---

# Phase 24 — Plan Gating Enforcement

**Goal**
Apply the subscription model built in Phase 23 to actually gate specific existing MVP features behind Free/Pro, per `VALUE_PROPOSITION.md`'s documented split.

**Features included**
Gating half of "Billing & Plan Gating."

**Files likely to be affected**
`BillingService` (new `requirePlan` guard, mirroring `AuthService.requireUserId`); gate points inside existing Server Actions/Services (e.g. an application-count ceiling in `ApplicationService.create`, `ExportService`, advanced sections of `AnalyticsService`); new Settings → Billing page; new upgrade-prompt UI components.

**Database changes**
None new — reuses Phase 23's `subscriptions` table.

**Documentation updates required**
`BUSINESS_RULES.md` (finalize concrete plan limits — this document, per its own instruction, takes precedence over implementation, so the rule must be written and reviewed before this phase's Server Action changes are considered complete); `FEATURES.md`/`VALUE_PROPOSITION.md` cross-checked for consistency; `UI_SYSTEM.md` (new Settings → Billing section); `API.md` (note which existing operations are now plan-gated); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 23.

**Estimated complexity**
High — touches multiple existing, previously-stable features at their gate points; review scope must be limited strictly to the documented gates, not general refactoring of the touched files.

---

# Phase 25 — Vercel Connection & External Monitoring

**Goal**
Complete production-readiness housekeeping appropriate now that real payments are possible.

**Features included**
None — infrastructure only.

**Files likely to be affected**
`.github/workflows/ci.yml` (new secrets); possibly a small `lib/monitoring.ts` initialization module.

**Database changes**
None.

**Documentation updates required**
`DEPLOYMENT.md` (Vercel connection confirmed done; monitoring solution and scope documented).

**Dependencies on previous phases**
Phase 24 (raises the cost of an unmonitored failure, though the Vercel connection step itself has no code dependency on billing).

**Estimated complexity**
Low.

---

# Phase 26 — Restore / Unarchive

**Goal**
Complete the soft-delete lifecycle for Companies, CV Versions, and Applications by adding the missing restore path.

**Features included**
Restore/Unarchive.

**Files likely to be affected**
`CompanyService`/`CompanyRepository`, `CVVersionService`/`CVVersionRepository`, `ApplicationService`/`ApplicationRepository` (new `restore` method each, re-running the same uniqueness pre-check `create` already runs); new "Archived" filter/tab on each list page.

**Database changes**
None (`deleted_at` already exists on every affected table).

**Documentation updates required**
`BUSINESS_RULES.md` (clarify that restore re-validates uniqueness against current active records); `API.md` (new restore operations documented per entity); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low.

---

# Phase 27 — Dedicated Search Results Page

**Goal**
Give Search a full results page beyond the header dropdown's fixed result cap.

**Features included**
Dedicated Search Results Page.

**Files likely to be affected**
New `app/(dashboard)/search/page.tsx`; `SearchService` (add pagination parameters in place of the fixed `SEARCH_RESULT_LIMIT`); `GlobalSearch` (optional "view all results" link).

**Database changes**
None.

**Documentation updates required**
`UI_SYSTEM.md` (new "Search Page" section, matching the pattern already used for Dashboard/Analytics/Applications/Companies); `API.md` (pagination parameters); `KNOWN_ISSUES.md` (remove the Phase 13 "no dedicated Search results page" entry); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low.

---

# Phase 28 — Markdown Rendering for Notes

**Goal**
Render note content as formatted Markdown, closing the existing gap between `BUSINESS_RULES.md`'s stated "Markdown supported" and the current plain-text-only display.

**Features included**
Markdown Rendering for Notes.

**Files likely to be affected**
The application-notes display component(s); `package.json` (one new, approved rendering dependency).

**Database changes**
None — `content` is already stored as raw Markdown text.

**Documentation updates required**
`CHANGELOG.md` ("Technical decisions" — record the dependency-approval conversation, per `IMPLEMENTATION_RULES.md`'s requirement); `KNOWN_ISSUES.md` (remove the Phase 10 "no markdown rendering" entry).

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low.

---

# Phase 29 — Analytics Completion

**Goal**
Implement the five metrics `ANALYTICS_ENGINE.md`/`FEATURES.md` document but were never built: Acceptance Rate (top-level), Average Offer/Hiring Time, Work Mode Analytics, Employment Type Analytics, Trend Analysis.

**Features included**
Analytics Completion.

**Files likely to be affected**
`AnalyticsService` (new groupings/time-delta calculations, reusing its existing generalized aggregation reducer); Analytics page components (new cards/sections).

**Database changes**
None (benefits from, but does not require, Phase 21's views).

**Documentation updates required**
`ANALYTICS_ENGINE.md` (mark each metric implemented); `KNOWN_ISSUES.md` (remove the Phase 12 documentation-gap entry); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19; sequencing after Phase 21 is recommended but not required.

**Estimated complexity**
Medium.

---

# Phase 30 — Interview Feedback

**Goal**
Allow users to attach structured feedback to a specific status-history stage.

**Features included**
Interview Feedback.

**Files likely to be affected**
New `src/features/interview-feedback/{components,actions,services,repositories,schemas,types}`; Application Detail page (feedback panel attached to each Status History row).

**Database changes**
New `interview_feedback` table (`application_status_history_id` FK, `user_id`, `rating`, `format`, `notes`, timestamps, `deleted_at`).

**Documentation updates required**
`DATABASE.md`, `BUSINESS_RULES.md` (new section: feedback ownership inherited through status history, append/edit rules), `API.md`, `FEATURES.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Medium.

---

# Phase 31 — Recruiter / Contact Tracking

**Goal**
Track recruiter/company contacts, optionally linked to applications.

**Features included**
Recruiter / Contact Tracking.

**Files likely to be affected**
New `src/features/contacts/{components,actions,services,repositories,schemas,types}`; Companies page (contacts sub-view); Application Detail page (contact picker).

**Database changes**
New `contacts` table; new `application_contacts` join table.

**Documentation updates required**
`DATABASE.md`, `BUSINESS_RULES.md`, `API.md`, `FEATURES.md`, `UI_SYSTEM.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Medium.

---

# Phase 32 — Offer Comparison & Salary Negotiation Tracking

**Goal**
Record negotiation events per application and provide a comparison view across open/accepted offers.

**Features included**
Offer Comparison & Salary Negotiation Tracking.

**Files likely to be affected**
New `src/features/offer-negotiations/{components,actions,services,repositories,schemas,types}`; Application Detail page (negotiation panel); new comparison view.

**Database changes**
New `offer_negotiations` table (append-only: insert/list methods only, no update/delete exposed at the repository layer).

**Documentation updates required**
`DATABASE.md`, `BUSINESS_RULES.md` (append-only negotiation history rule), `API.md`, `FEATURES.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19; benefits from, but does not require, Phase 29 (Average Offer Time already available for comparison context).

**Estimated complexity**
Medium.

---

# Phase 33 — Kanban Board View

**Goal**
Add an alternate, drag-and-drop pipeline visualization for Applications, resolving the ambiguity between `VALUE_PROPOSITION.md`'s reference to a Kanban board and `UI_SYSTEM.md`'s table-only spec.

**Features included**
Kanban Board View.

**Files likely to be affected**
New Kanban board Client Component; Applications page (view toggle).

**Database changes**
None.

**Documentation updates required**
`UI_SYSTEM.md` (new section describing the board view and its place alongside the table); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19. Must call the existing `ApplicationStatusService.changeStatus` unchanged — no shortcut validation path may be introduced for the sake of drag interaction.

**Estimated complexity**
Medium.

---

# Phase 34 — Bulk Actions

**Goal**
Wire the existing, currently-unused `DataTable` row-selection capability to real bulk operations.

**Features included**
Bulk Actions on Tables.

**Files likely to be affected**
`ApplicationService`, `CompanyService` (new bulk methods that loop the existing single-item method and aggregate per-row results — never a new bulk-only validation path); `ApplicationsTable`/`CompaniesTable` (bulk action bar).

**Database changes**
None.

**Documentation updates required**
`UI_SYSTEM.md` (bulk actions now in scope, reversing the MVP's explicit exclusion); `API.md`; `KNOWN_ISSUES.md` (remove/reconfirm the "bulk actions out of scope" and "select-all page-only" entries); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Medium.

---

# Phase 35 — Supabase Storage Configuration

**Goal**
Enable Supabase Storage, the project's first file-storage capability, reversing the MVP-era "should not be configured" constraint.

**Features included**
None — infrastructure only, prerequisite for Phase 36.

**Files likely to be affected**
New `lib/supabase/storage.ts`; bucket and storage-policy configuration (tracked as its own migration-equivalent artifact).

**Database changes**
Storage bucket + storage-level access policies (distinct from table RLS — requires its own explicit review).

**Documentation updates required**
`DEPLOYMENT.md` (storage now configured); `DATABASE.md` (note the new storage dependency for CV attachments, without yet describing the feature itself).

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low–Medium.

---

# Phase 36 — CV/Resume File Attachment

**Goal**
Allow uploading and retrieving the actual CV file for a CV Version, using the storage capability from Phase 35.

**Features included**
CV/Resume File Attachment.

**Files likely to be affected**
`CVVersionService`/`CVVersionRepository` (upload/replace/remove methods); CV Version form and list UI (upload/download affordances); Application Detail (CV download link).

**Database changes**
New nullable column on `cv_versions` (`file_path`).

**Documentation updates required**
`DATABASE.md`, `BUSINESS_RULES.md` (soft-deleting a CV version preserves its file), `API.md`, `FEATURES.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 35.

**Estimated complexity**
Medium.

---

# Phase 37 — Tags / Skills + Skill Analytics

**Goal**
Add tagging to applications and a matching Analytics grouping.

**Features included**
Tags / Skills + Skill Analytics.

**Files likely to be affected**
New `src/features/tags/{components,actions,services,repositories,schemas,types}`; `ApplicationForm` (tag input); Applications page (tag filter); `AnalyticsService` (fifth grouping, reusing the existing generalized reducer).

**Database changes**
New `tags` table; new `application_tags` join table.

**Documentation updates required**
`DATABASE.md`, `BUSINESS_RULES.md` (Search's already-reserved "Tags (future)" field now implemented), `API.md`, `ANALYTICS_ENGINE.md`, `FEATURES.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19; benefits from Phase 21 (views) and Phase 29 (established grouping pattern).

**Estimated complexity**
Medium.

---

# Phase 38 — Application Goals / Weekly Objectives

**Goal**
Let users set a personal application target and track progress against it.

**Features included**
Application Goals / Weekly Objectives.

**Files likely to be affected**
New `src/features/goals/{components,actions,services,repositories,schemas,types}`; Dashboard (goal progress card).

**Database changes**
New `goals` table.

**Documentation updates required**
`DATABASE.md`, `ANALYTICS_ENGINE.md`, `FEATURES.md`, `UI_SYSTEM.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low–Medium.

---

# Phase 39 — Service-Role Client Introduction

**Goal**
Introduce a narrowly-scoped Supabase Admin/service-role client, strictly isolated from every other Service, as a dedicated prerequisite for Phase 40. This phase adds no user-facing behavior.

**Features included**
None — infrastructure only.

**Files likely to be affected**
New `lib/supabase/admin.ts` (or equivalent) — must not be imported anywhere except the Service built in Phase 40.

**Database changes**
None.

**Documentation updates required**
`ARCHITECTURE.md` (document this as a deliberate, explicitly scoped exception to "never expose Service Role Key," confined to server-only elevated operations); `DEPLOYMENT.md` (`SUPABASE_SERVICE_ROLE_KEY` moves back to "required," reversing Phase 18's MVP-era correction); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low.

---

# Phase 40 — Account Deletion ("Danger Zone")

**Goal**
Implement the Settings capability named in `FEATURES.md`/`UI_SYSTEM.md` since the MVP but never built.

**Features included**
Account Deletion.

**Files likely to be affected**
New `AccountDeletionService`/`AccountDeletionRepository` (the only code path permitted to use Phase 39's admin client); Settings page (Danger Zone section + confirmation dialog).

**Database changes**
None structurally if using cascading deletes through existing FKs; a scheduled-purge column only if a soft-delete-then-purge approach is chosen instead.

**Documentation updates required**
`BUSINESS_RULES.md` (new, explicit account-deletion rule — the one legitimate hard-deletion case in the system, distinct from the soft-delete rule governing business entities); `FEATURES.md`, `UI_SYSTEM.md`, `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 39.

**Estimated complexity**
Medium.

---

# Phase 41 — Guided Onboarding

**Goal**
Reduce first-session friction for brand-new accounts via a guided setup stepper.

**Features included**
Guided First-Session Onboarding.

**Files likely to be affected**
New onboarding stepper component (composing the existing Create Company/CV/Application dialogs unchanged); dashboard layout (conditional render for empty accounts).

**Database changes**
None (or an optional `users.has_completed_onboarding` column, if an emptiness check alone is judged insufficient during review).

**Documentation updates required**
`UI_SYSTEM.md`; `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low–Medium.

---

# Phase 42 — Mobile Quick-Add (Floating Action Button)

**Goal**
Close the documented-but-unbuilt "Floating Navigation if required" gap from `UI_SYSTEM.md`'s Mobile layout section.

**Features included**
Mobile Quick-Add.

**Files likely to be affected**
New shared FAB component (feature-agnostic, action passed in as a prop — following the same prop-injection discipline Phase 19 restored in `TopNav`, not repeating that regression); dashboard layout.

**Database changes**
None.

**Documentation updates required**
`UI_SYSTEM.md` (mark implemented); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 19.

**Estimated complexity**
Low.

---

# Phase 43 — End-to-End Test Suite

**Goal**
Close the verification gap spanning all MVP and V2 phases once a real, confirmed, reachable test environment exists.

**Features included**
None — testing infrastructure only.

**Files likely to be affected**
New `e2e/` test suite; `.github/workflows/ci.yml` (new job).

**Database changes**
A dedicated Supabase test project/seed data — no production schema change.

**Documentation updates required**
`KNOWN_ISSUES.md` (remove the Phase 17/Phase 18 "no E2E tests"/"never verified against live data" entries); `CHANGELOG.md`.

**Dependencies on previous phases**
Requires a reachable, confirmed test environment — the same persistent constraint that has applied since Phase 4 of the MVP. Not strictly ordered against other V2 phases; run opportunistically whenever that environment becomes available, ideally covering as many prior V2 phases as already exist at that point.

**Estimated complexity**
Medium–High.

---

# Phase 44 — Public API (Read-Only)

**Goal**
Introduce API-key authentication as the application's second authentication path, alongside the existing session-cookie model, and expose read-only endpoints mirroring `API.md`'s documented operations.

**Features included**
Public API.

**Files likely to be affected**
New `app/api/v1/*` route handlers; new `src/features/api-keys/{components,actions,services,repositories,schemas,types}`; rate-limiting logic tied to plan tier.

**Database changes**
New `api_keys` table.

**Documentation updates required**
`API.md` (moves from an internal contract description to a real, versioned public surface); `ARCHITECTURE.md` (document API-key authentication as an approved second entry point, with authentication proven independently for this path — not assumed inherited from the Server Action guard); `DATABASE.md`; `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 23 (Route Handler pattern already established) and Phase 24 (plan-based rate-limit tiering).

**Estimated complexity**
High.

---

# Phase 45 — Browser Extension Companion

**Goal**
Reduce data-entry friction via a browser extension that submits applications through the Public API.

**Features included**
Browser Extension Companion.

**Files likely to be affected**
No changes to the main application beyond any extension-specific CORS/auth accommodations inside `app/api/v1/*`; the extension itself is a separate codebase/build/deployment pipeline outside this repository's scope.

**Database changes**
None beyond Phase 44.

**Documentation updates required**
`API.md` (extension-specific authentication flow, if distinct from standard API-key usage); `CHANGELOG.md`.

**Dependencies on previous phases**
Phase 44.

**Estimated complexity**
High.

---

# Quality Gates

Before moving to the next phase:

✓ Build succeeds.

✓ TypeScript passes.

✓ Lint passes.

✓ Tests pass.

✓ No console errors.

✓ `BUSINESS_RULES.md` reflects every new rule introduced by the phase.

✓ `DATABASE.md` reflects every new table/column/view/function introduced by the phase.

✓ `KNOWN_ISSUES.md`/`CHANGELOG.md` are up to date.

---

# Forbidden

Do not implement features from future phases.

Do not combine two phases' scopes into a single implementation pass.

Do not introduce more than one new architectural pattern in a single phase — Phases 23, 39, and 44 are the only phases permitted to introduce one, and each does so in isolation.

Do not modify an existing MVP table, column, or constraint — every V2 database change must be additive only.

Do not gate a feature behind a plan (Phase 24 onward) without the corresponding rule first existing in `BUSINESS_RULES.md`.

Do not skip validation or documentation updates to "move faster."

Do not introduce new dependencies without approval.

Do not modify previous phases unless fixing a bug introduced by that phase.

---

# Claude Instructions

Follow this implementation order exactly.

Complete each phase before starting the next.

Do not anticipate future features.

Every phase should leave the project in a stable, working, and deployable state, exactly as the MVP roadmap required.

If a later V2 phase requires changes to an earlier V2 phase or to the MVP itself, keep those changes minimal, additive, and backwards compatible — the MVP that shipped and was validated must continue to work exactly as documented throughout every phase of Version 2.
