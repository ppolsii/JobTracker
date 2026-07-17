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

`CompanyService.archive`'s check against `applications.company_id` is implemented correctly per the schema (Phase 3), but there are no real applications yet (Phase 8 not built) to confirm the rejection path fires correctly end-to-end. Revisit once Phase 8 exists.

---

# Technical Debt

Temporary workarounds are allowed only if they are:

- Documented in KNOWN_ISSUES.md.
- Explicitly justified.
- Scheduled for later removal.