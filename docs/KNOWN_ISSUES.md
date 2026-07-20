# KNOWN ISSUES

Tracks accepted technical debt, limitations, and postponed items.

---

## Phase 1 — Project Setup

### Import order is not automatically enforced

`CODE_STYLE.md` defines an import grouping convention (React/Next → external → shared → feature → relative). No ESLint plugin enforces this automatically — kept the dependency set minimal per `PROJECT_CONSTRAINTS.md`. Convention must be followed manually during development and code review.

### Transitive `postcss` advisory (moderate)

`npm audit` reports a moderate-severity advisory in `postcss` (bundled inside Next.js's own dependency tree, not a direct dependency). The only fix `npm audit fix --force` offers is downgrading Next.js to `9.3.3`, which contradicts ADR-001 ("latest stable version should always be used") and is not a real fix. No action taken; revisit once Next.js ships an updated internal `postcss` version.

---

## Phase 2 — Supabase

Live Supabase connectivity has been verified (Phase 3) — resolved, no longer tracked here.

---

## Phase 3 — Database

### Database types are hand-authored, not CLI-generated

`src/types/supabase.ts` was written by hand to match the schema exactly, rather than via `supabase gen types typescript`, because that command requires a direct Postgres connection (DB password or access token) which hasn't been shared, by choice, for this project. The hand-authored version omits the `Relationships` metadata the real generator includes (left as empty arrays) — this doesn't affect `Row`/`Insert`/`Update` type safety, only embedded-resource query typing (e.g. `select=*, companies(*)`). Recommend running the real generator once, whenever convenient, to replace this file with the authoritative version.

### Authenticated-role RLS behavior not yet exercised end-to-end

Verification so far confirms: all 6 tables exist, and the `anon` role is fully denied (no grants, confirmed via REST). What hasn't been exercised yet is RLS filtering *for an authenticated user* (e.g., user A cannot see user B's rows) — there's no login flow (Phase 4) or real data (Phase 6+) yet to test that against. Revisit once those phases exist.

---

## Phase 4 — Authentication

### Full registration happy-path not verified end-to-end

Confirmed in Phase 5 testing: this Supabase project has "Confirm email" **enabled** (a real signup returns no session and `confirmation_sent_at` is set; login before confirming correctly fails with `email_not_confirmed`). Since there's no way to click a real confirmation email link in this environment, the full signup → confirm → `/dashboard` → logout path still hasn't been exercised end-to-end. The code path is correct as far as it can be verified (registration reaches Supabase's real signup call, `AuthService.register`'s `requiresEmailConfirmation` check behaves as designed) — this should be manually confirmed once, by actually clicking a confirmation email.

### Password-reset email link handling assumes the default (unconfigured) Supabase email template

`UpdatePasswordForm` assumes Supabase's out-of-the-box "Reset Password" template, which redirects with the session in a URL hash fragment (handled client-side by the browser Supabase client). If the project's email templates are ever reconfigured to use the newer `token_hash`-based link format, this would need a server-side `/auth/confirm` route handler using `verifyOtp` instead. Not implemented, since customizing email templates isn't mentioned as in-scope anywhere in `/docs` and the dashboard configuration can't be inspected from here.

---

## Phase 5 — Shared UI

### Shell verified via a temporary route, not the real `/dashboard`

Reaching the actual protected dashboard requires a confirmed account, which (see Phase 4 above) isn't possible in this environment. The Sidebar/TopNav/MobileSidebar/UserMenu/DataTable/EmptyState/ConfirmDialog were all verified by temporarily rendering `MainLayout` on an unprotected route, then deleting that route. The composition in `(dashboard)/layout.tsx` itself (passing `footer`/`userMenu` props) is simple enough that this is a low-risk gap, but the full authenticated path through the real `/dashboard` route hasn't been visually confirmed.

### DataTable's "select all" only covers the current page

Selecting "all" only selects rows visible on the current page, not every row across all pages. This is a deliberate v1 simplification (documented in the component), not a bug - revisit if a future feature genuinely needs cross-page bulk selection.

---

## Phase 6 — Company Management

### Real Server Actions not verified against live data

Same root cause as Phases 4–5: this Supabase project requires email confirmation and there's no confirmed test account reachable from this environment, so `createCompanyAction`/`updateCompanyAction`/`archiveCompanyAction` were never actually exercised against the live database - only the UI layer was verified (via a temporary route rendering `CompaniesTable` with mock data). Specifically unverified: the duplicate-name rejection actually round-tripping through Supabase, the new case-insensitive unique index behaving as intended, and the archive-blocking count query. The logic was verified via code review instead. Should be manually confirmed once a real account is available.

### New migration not yet applied

`supabase/migrations/20260716222143_case_insensitive_company_names.sql` has not been applied to the Supabase project (the user applies migrations manually via the SQL Editor, per the established Phase 3 workflow). Until it's run, company name uniqueness remains case-sensitive at the database level, even though `CompanyService`'s pre-check already treats names case-insensitively - a mismatch that only matters if the pre-check is ever bypassed (e.g., a race between two concurrent requests with different-case names).

### Archive-blocking rule untested against real application data

`CompanyService.archive`'s check against `applications.company_id` is implemented correctly per the schema (Phase 3) and the applications feature now exists (Phase 8), but the check still hasn't been exercised against real data - same live-account blocker as everywhere else in this list. Revisit once a confirmed test account is available.

---

## Phase 7 — CV Version Management

### Real Server Actions not verified against live data

Same root cause as Phases 4–6: no confirmed test account is reachable from this environment (email confirmation required), so `createCVVersionAction`/`updateCVVersionAction`/`archiveCVVersionAction` were never exercised against the live database. Specifically unverified: the duplicate-name rejection round-tripping through Supabase, the new case-insensitive unique index, and the archive-blocking count query. The logic was verified via code review against the browser-verified Phase 6 companies feature it mirrors exactly. Should be manually confirmed once a real account is available.

### New migration not yet applied

`supabase/migrations/20260718120000_case_insensitive_cv_version_names.sql` has not been applied to the Supabase project (the user applies migrations manually via the SQL Editor, per the Phase 3 workflow). Until it's run, CV name uniqueness remains case-sensitive at the database level, even though `CVVersionService`'s pre-check already treats names case-insensitively — a mismatch that only matters if the pre-check is ever bypassed (e.g., a race between two concurrent requests with different-case names).

### Archive-blocking rule untested against real application data

`CVVersionService.archive`'s check against `applications.cv_version_id` is implemented correctly per the schema (Phase 3) and the applications feature now exists (Phase 8), but the check still hasn't been exercised against real data - same live-account blocker as everywhere else in this list. Revisit once a confirmed test account is available.

---

## Phase 8 — Application Management

### Real Server Actions not verified against live data

Same root cause as Phases 4–7: no confirmed test account is reachable from this environment (email confirmation required), so `createApplicationAction`/`updateApplicationAction`/`archiveApplicationAction` were never exercised against the live database. Specifically unverified: the FK-ownership/active validation (`findActiveById` round-tripping correctly), the genesis status-history insert, the salary/date CHECK constraint mapping, and the search/filter/sort query construction generally. The logic was verified via code review instead. Should be manually confirmed once a real account is available.

### Composite-FK embedded-resource query not verified live

`ApplicationRepository.list` selects `companies!inner(name), cv_versions!inner(name)` to display names and to support server-side sorting by Company (`.order("name", { referencedTable: "companies" })`). `applications.company_id`/`cv_version_id` are constrained via **composite** foreign keys (`(company_id, user_id) REFERENCES companies (id, user_id)`), not plain single-column FKs. PostgREST/Supabase-js is expected to support embedding through a composite FK when there's no relationship ambiguity (exactly one FK path exists here), but this has not been exercised against a live Supabase project in this environment.

**If it turns out not to work** (e.g., a "Could not find a relationship" error from PostgREST): replace the embedded select with two extra `.in("id", [...])` queries (fetch the page of applications first, collect distinct `company_id`/`cv_version_id`, then fetch names separately and merge in `ApplicationService.list`) - a pattern already proven safe elsewhere in this codebase (`CompanyRepository`/`CVVersionRepository`'s existing `.in()`-style lookups). Sorting by Company/CV Version name would then need to fall back to a client-side sort of the current page only (with a clear UI caveat), until either this is fixed or a later phase introduces a dedicated read view.

### New migration not yet applied

`supabase/migrations/20260718120000_case_insensitive_cv_version_names.sql` (from Phase 7) still has not been applied - unrelated to this phase but noted again since Phase 8 doesn't add a new migration of its own (no schema changes were needed; Phase 3's `applications` table already supports everything this phase requires).

### Duplicate application feature gap

`FEATURES.md` Feature 5 lists "Duplicate" as a functional requirement for Job Applications; `IMPLEMENTATION_ORDER.md`'s Phase 8 task list does not mention it, and `API.md` documents no corresponding endpoint. Deliberately not implemented this phase (see `CHANGELOG.md` "Deviations"). If the product actually wants this, it should be added to `IMPLEMENTATION_ORDER.md`/`API.md` explicitly and picked up as a small follow-up rather than silently expanded now.

### Genesis status-history insert is not atomic with application creation

**Resolved (Version 2, Phase 20).** `ApplicationRepository.create` now calls the `create_application_with_genesis` Postgres function, which inserts the application and its genesis `application_status_history` row in one transaction - see `DATABASE.md` "Functions". No longer tracked.

### Editing an application whose Company/CV Version was later archived shows an empty picker

**Resolved (Post-MVP Technical Debt Resolution).** `ApplicationForm` now widens its `application` prop to `ApplicationWithRelations` (callers already had this type available) and merges the application's own current company/CV version into the picker options when it isn't already present in the active-only `companies`/`cvVersions` arrays passed down. This changes only what is visible in the Select - `ApplicationService.validateReferences` still independently rejects any archived reference server-side, unchanged.

---

## Phase 9 — Status Tracking

### Real Server Actions not verified against live data

Same root cause as Phases 4-8: no confirmed test account is reachable from this environment (email confirmation required), so `changeApplicationStatusAction` was never exercised against the live database. Specifically unverified: the transition-rejection path, the application-date-required-after-Wishlist path (including the exact ordering of the date-update-then-history-insert against the live `applications_date_required_after_wishlist_check` constraint), and the `sync_current_status` trigger actually firing as expected. The logic was verified via code review and by manually tracing the constraint's evaluation order against the Phase 3 migration SQL. Should be manually confirmed once a real account is available.

### Date-then-transition write is not atomic

**Resolved (Version 2, Phase 20).** `ApplicationStatusService.changeStatus` now calls `ApplicationRepository.transitionStatus`, which uses the `transition_application_status` Postgres function to update `application_date` (when needed) and insert the history row in one transaction - see `DATABASE.md` "Functions". No longer tracked.

### `offer_salary`, `rejection_reason`, `response_date` are never populated

These columns exist on `applications` (Phase 3) but no Service in any phase through Phase 9 writes to them. Neither `BUSINESS_RULES.md` nor `ANALYTICS_ENGINE.md` requires them for any currently-specified feature or metric, so this isn't a gap against a documented requirement - flagged here only so a future phase (most likely if Analytics or a richer transition UI is ever requested) doesn't assume they contain real data.

### Application Detail page's data freshness after a status change relies on Server Action cache revalidation

`changeApplicationStatusAction` calls `revalidatePath` for both the list and detail routes, the same mechanism every other mutating action in this codebase already relies on (Companies/CV Versions/Applications' create/update/archive). Not independently re-verified for this specific new route (`/applications/[id]`) against a live deployment - if it doesn't behave as expected, every other phase's equivalent revalidation would need re-examination too, since the mechanism is identical.

---

## Phase 10 — Notes

### Real Server Actions not verified against live data

Same root cause as Phases 4-9: no confirmed test account is reachable from this environment. `createApplicationNoteAction`/`updateApplicationNoteAction`/`archiveApplicationNoteAction` were never exercised against the live database - specifically unverified: the ownership-check path through `ApplicationService.getById` actually rejecting a note that belongs to another user's application, and the ownership-inherited RLS policies on `application_notes` (no `user_id` column of its own) behaving as expected. Verified via code review and by tracing the RLS policy SQL directly. Should be manually confirmed once a real account is available.

### No markdown rendering

Note content is stored and displayed as plain text (`whitespace-pre-wrap`); markdown syntax a user types (e.g. `**bold**`) is preserved faithfully but not parsed into formatted HTML, since no markdown-rendering library is installed or approved (`IMPLEMENTATION_RULES.md` requires approval before adding a dependency). If real markdown rendering is wanted, it needs a dependency-approval conversation (e.g. `react-markdown` or similar) before implementation.

### `ApplicationNoteService` and `ApplicationStatusService` intentionally use different cross-boundary styles

`ApplicationStatusService` (Phase 9) calls `ApplicationRepository` directly, being a sibling sub-concern of the same table. `ApplicationNoteService` (Phase 10) instead goes through `ApplicationService.getById`, per this phase's more explicit "reuse existing Services" instruction. Both are internally consistent and correct, but a future reader comparing the two sibling services side by side will notice the asymmetry - documented here so it reads as a deliberate choice, not an oversight. Not something to "fix" by changing Phase 9 (no bug exists there to justify touching it).

---

## Phase 11 — Dashboard

### Real data not verified against a live database

Same root cause as every prior phase: no confirmed test account is reachable from this environment. `ApplicationStatsService.getDashboardCounts`'s five `COUNT` queries and `DashboardService.getSummary`'s aggregation were verified via code review and by tracing each formula against `ANALYTICS_ENGINE.md`, not by exercising them against real application data. Should be manually confirmed once a real account is available.

### Company/CV Version option-list mapping is now duplicated a third time

Resolved in Phase 16 (Optimisation) — extracted to `ApplicationPickerService.getOptions` (`src/features/applications/services/application-picker.service.ts`), adopted by all three pages. No longer tracked here.

### KPI-count queries are separate from the Recent Applications query

Loading the dashboard issues 8 total queries (5 KPI counts + 1 recent-applications list + 1 companies list + 1 CV versions list). All are fixed-count (not per-row, no N+1) and individually cheap (`head: true` counts or already-indexed, limited selects), but no evidence yet exists that this is a real bottleneck at any realistic MVP data volume. Per `IMPLEMENTATION_RULES.md` "do not optimise prematurely," no further consolidation (e.g. a single SQL view or RPC combining the five counts) was attempted - `DATABASE.md` explicitly reserves views for "future versions" in any case.

---

## Phase 12 — Analytics

### Real data not verified against a live database

Same root cause as every prior phase: no confirmed test account is reachable from this environment. Every formula (Response/Interview/Offer Rate, Average Response Time, Funnel entering/progressing/rejected, Insights' tie-break logic) was verified by code review and by tracing the calculation against `ANALYTICS_ENGINE.md`'s definitions and the Phase 3 status-history constraints, not by exercising it against real historical application data. Should be manually confirmed once a real account is available, ideally with a dataset spanning multiple months, CVs, companies, and sources to exercise every grouping and the documented minimum-sample-size gates.

### Several ANALYTICS_ENGINE.md / FEATURES.md metrics are intentionally not implemented

`IMPLEMENTATION_ORDER.md`'s Phase 12 task list names exactly 9 deliverables (Response Rate, Interview Rate, Offer Rate, Monthly/Company/CV/Source Analytics, Funnel Analytics, Insights). The following are described in `ANALYTICS_ENGINE.md` and/or `FEATURES.md` Feature 8 but appear in neither Phase 12's task list nor any other phase's: **Acceptance Rate** as its own top-level metric (currently used only internally, for the CV insight's tie-break), **Average Offer Time** / **Average Hiring Time** (the standalone "Time Metrics" section - only "Average Response Time" is used, since it's the one explicitly required as a column of the in-scope Company/CV/Source Analytics sections), **Work Mode Analytics**, **Employment Type Analytics**, and **Trend Analysis** (month-over-month growth percentages). This is a genuine, real documentation gap - not an oversight - flagged here the same way Phase 8 flagged "Duplicate application." If any of these are wanted, they should be added to `IMPLEMENTATION_ORDER.md` explicitly (or claimed by a specific future phase) rather than assumed to already exist.

### Two bulk reads aggregated in application code, not SQL `GROUP BY`

**Partially resolved (Version 2, Phase 21).** Company/CV/Monthly Analytics' counts and the Overview's counts are now computed by `GROUP BY` in the four `DATABASE.md` "Views" (`dashboard_metrics`, `cv_statistics`, `company_statistics`, `monthly_statistics`), not by iterating applications in memory. Still true, and not resolved by this phase: `AnalyticsService` still fetches all of a user's non-archived applications and status history in two bulk queries, needed for Source Analytics (no `source_statistics` view was reserved), Funnel Analytics, Insights, and every grouping's Average Response Time (needs per-application status-history timestamps a per-status count view cannot provide). This remaining scope is intentionally out of Phase 21 - see `CHANGELOG.md` for the reasoning. At a realistic MVP data volume this remains fast and well within the documented <500ms target.

---

## Phase 13 — Search

### Real data not verified against a live database

Same root cause as every prior phase: no confirmed test account is reachable from this environment.

### No dedicated Search results page

`UI_SYSTEM.md` documents "Search" only under "Top Navigation," with no "Search Page" section the way Dashboard/Analytics/Applications/Companies each get one - the header dropdown is the complete UI surface for this phase, not a placeholder for a fuller page.

---

## Phase 14 — Export

### CSV scope vs. documented behaviour

**Resolved (Post-MVP Technical Debt Resolution).** `API.md` previously documented `GET /export/csv` and `GET /export/json` with the identical line "Exports all user data" for both, while the implementation covered only Applications for CSV - a genuine compliance gap, confirmed by a subsequent architectural review. Rather than expanding CSV's mechanism (which would require a zip/multi-file dependency this project's constraints caution against, and would be new functionality outside this resolution's scope), `API.md`, `BUSINESS_RULES.md`, and `FEATURES.md` were corrected to describe CSV's actual, sensible scope explicitly: a single flat table of Applications, denormalized with Company/CV Version names. JSON remains the format that satisfies "every user-owned entity" literally. No longer tracked as a mismatch.

### `application_status_history` missing from JSON export

**Resolved (Post-MVP Technical Debt Resolution).** `ExportService.exportJSON` now includes a `statusHistory` field, populated via the existing `ApplicationStatusService.listHistoryForApplications` (the same bulk-by-ID-list method `AnalyticsService` already uses) - no new repository method was needed. No longer tracked.

### Archived (soft-deleted) records excluded from every export path

**Resolved (Post-MVP Technical Debt Resolution).** Added `listAllIncludingArchived` to `CompanyRepository`/`CompanyService`, `CVVersionRepository`/`CVVersionService`, and `ApplicationRepository`/`ApplicationService` - each a narrow sibling to the existing `list`, used only by `ExportService`, so every other caller (list pages, pickers, Search, Dashboard) keeps its correct active-only behaviour unchanged. `ApplicationNoteRepository.listAllForUser` was modified in place (its only caller was already `ExportService`) to drop its `deleted_at` filters. Both `exportCSV` and `exportJSON` now use these. No longer tracked.

---

## Phase 15 — Settings

### Real data not verified against a live database

Same root cause as every prior phase.

### "Danger Zone" (account deletion) was not implemented

Named in `FEATURES.md`/`UI_SYSTEM.md` but absent from `IMPLEMENTATION_ORDER.md`'s Phase 15 task list. It would also require a Supabase Admin API / service-role client, which does not exist anywhere in this codebase - see `DEPLOYMENT.md`'s `SUPABASE_SERVICE_ROLE_KEY` note (Phase 18).

---

## Phase 16 — Optimisation

### Action-layer boilerplate (auth check + Zod parse + Service call) was considered for extraction and rejected

Every Server Action across every feature repeats the same three lines (`requireUserId`, `schema.safeParse`, delegate to a Service). This is real, codebase-wide duplication, but extracting it into a shared `withAuth`/`withValidation` wrapper would touch every action file in the app for a purely stylistic gain, and would introduce exactly the kind of decorator/higher-order-function abstraction `IMPLEMENTATION_RULES.md`'s "avoid unnecessary abstractions" and this phase's own "do not redesign the architecture" instruction caution against. Left as-is; each occurrence is three plain, readable lines, not a maintenance hazard.

### `full_name` validation duplicated between `registerSchema` and `updateProfileSchema`

Both use the identical `z.string().trim().min(2, "Enter your full name.")` for the same logical field (`auth/schemas/auth.schema.ts`, `users/schemas/user.schema.ts`). A shared cross-feature schema fragment for one field was considered and rejected - `auth` and `users` are separate features, and extracting a single Zod chain shared by exactly two call sites is a worse trade than the small, already-commented duplication it would replace.

### `DataTable`'s `isLoading` prop remains unused

No table in the app passes `isLoading` - every table's data already arrives resolved from a Server Component, so this capability has had no real caller since it was built. Wiring it up would require restructuring pages to fetch client-side, a behaviour change outside this phase's scope (routes now have `loading.tsx` Suspense fallbacks instead - see Optimizations). Left as dead-but-harmless capability, not removed, since a future client-fetching feature could still legitimately use it.

---

## Phase 17 — Testing

### End-to-end tests were not implemented

`IMPLEMENTATION_ORDER.md` names Unit, Integration, and End-to-End Tests as this phase's three tasks. No confirmed, email-verified Supabase test account has been reachable from this environment at any point since Phase 4, and this sandboxed environment's ability to reliably run a headless browser against a live local server was unverified. Given this phase's explicit "all tests must pass" / "deterministic" requirements, installing a framework (e.g. Playwright) that could not be reliably executed and verified here would have been a worse outcome than not installing it. Recommend introducing it once a real, reachable test environment (a confirmed Supabase test account, a deployable preview environment) exists.

### Repositories are not directly tested

They are thin Supabase query builders with no branching logic of their own; deeply mocking Supabase's fluent query builder to test a plain `.eq().is().select()` chain would mostly test the mock, not real behaviour. Their correctness is exercised indirectly through the Service-layer integration tests, which assert Services call them with the right arguments and handle their results correctly. True Repository/RLS correctness still requires a live Supabase account.

### CV Versions' Service was not separately tested

It mirrors `CompanyService` exactly (same duplicate-name/archive-blocking shape) - a dedicated test file would duplicate `company.service.test.ts` almost verbatim for no additional real coverage.

---

## Phase 18 — Production Ready

### End-to-end verification against a live Supabase project remains outstanding

This is the cumulative form of every "Real data not verified against a live database" entry recorded in every phase since Phase 4: no confirmed, email-verified Supabase test account has been reachable from this environment at any point across the entire project. Every business rule, RLS policy, and constraint has been verified by code review and by tracing the implementation against its documented specification (`BUSINESS_RULES.md`, `DATABASE.md`, `ANALYTICS_ENGINE.md`), never by exercising the running application against real historical data. This should be the first thing manually confirmed once a real account is available, ideally with a dataset spanning multiple months, companies, CV versions, and sources.

### `SUPABASE_SERVICE_ROLE_KEY` remains unused

Confirmed via a full-codebase grep during this phase's security review: no code path anywhere uses the Supabase Admin API or a service-role client. `DEPLOYMENT.md` has been corrected to reflect this (moved out of "required" environment variables). It would only become required if a future version implements a feature needing elevated privileges (e.g. Phase 15's deferred "Danger Zone" account deletion).

### Connecting the GitHub repository to Vercel is a manual, dashboard-side step

`.github/workflows/ci.yml` (added this phase) covers the CI gate (type check, lint, build, unit tests) that `DEPLOYMENT.md` requires before deployment. The actual deployment mechanism - Vercel's automatic-deploy-on-push-to-`main` and preview-deployments-per-PR - is configured by connecting the repository in the Vercel dashboard, which cannot be done from this environment. This is expected, minimal, one-time manual setup, not a gap in the application itself.

---

# Technical Debt

Temporary workarounds are allowed only if they are:

- Documented in KNOWN_ISSUES.md.
- Explicitly justified.
- Scheduled for later removal.