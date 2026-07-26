# CHANGELOG

All notable changes to this project are documented in this file.

---

## Phase 1 — Project Setup (2026-07-15)

Initial project scaffold, per `IMPLEMENTATION_ORDER.md`.

### Added

- Next.js 16 project (App Router, TypeScript strict mode, `src/` directory, `@/*` import alias).
- Tailwind CSS v4.
- shadcn/ui configuration (`components.json`), aliased into `src/shared/components` to match `ARCHITECTURE.md`'s project structure instead of the CLI's default top-level `components/`.
- Inter font (per `UI_SYSTEM.md` typography) replacing the default Geist font.
- Class-based dark mode variant (`.dark`) wired into Tailwind's theme, ready for the theme toggle built in Phase 5.
- ESLint (Next.js config) + Prettier, reconciled via `eslint-config-prettier`.
- Repository skeleton matching `ARCHITECTURE.md`: `src/{app,features,shared,lib,config,types}`.
- `src/config/site.ts` with app name/description used in page metadata.
- `.env.example` listing the environment variables required from Phase 2 onward.
- `.nvmrc` pinning Node 22 for local/production consistency.
- Root `README.md` (tech stack, requirements, install/dev/build commands).
- Git repository initialized (`main` branch).

### Notes

- No Supabase wiring, authentication, or business features yet — those begin in Phase 2.
- `shadcn init` auto-generated a `Button` primitive as part of its standard init flow; this was kept as-is rather than removed, since it's a non-business UI primitive consistent with ADR-012.

---

## Phase 2 — Supabase (2026-07-15)

Backend service configuration, per `IMPLEMENTATION_ORDER.md`.

### Added

- `@supabase/supabase-js` and `@supabase/ssr` (the only dependencies added — required to implement ADR-003/004/005: Supabase Postgres, Supabase Auth, RLS enforced from the server).
- `src/config/env.ts` — validated access to the Supabase public env vars, fails fast with a clear error if either is missing.
- `src/lib/supabase/client.ts` — browser Supabase client (`createBrowserClient`).
- `src/lib/supabase/server.ts` — server Supabase client for Server Components/Actions (`createServerClient`, cookie-based session).
- `src/lib/supabase/middleware.ts` — `updateSession` helper that refreshes the auth session on every request.
- `src/proxy.ts` — root request proxy wiring `updateSession` in (Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`; the deprecated name was never committed to this state).

### Changed

- `package.json` — added `engines.node` (`>=22.0.0`) to enforce the same Node version as `.nvmrc` (Phase 1 consistency fix, no functional change).

### Notes

- No login/register UI, protected-route redirects, or database schema yet — those are Phases 3 and 4. This phase only establishes the client/session plumbing.
- Live connectivity to a real Supabase project (`IMPLEMENTATION_ORDER.md`'s Definition of Done for this phase) could not be verified end-to-end in this session because no project credentials were supplied — see `KNOWN_ISSUES.md`.

---

## Phase 3 — Database (2026-07-15)

Complete PostgreSQL schema, per `DATABASE.md`, applied to the configured Supabase project.

### Added

- `supabase/migrations/20260715085856_enums_and_tables.sql` — 4 enums (`work_mode`, `employment_type`, `application_status`, `application_source`), all 6 tables (`users`, `companies`, `cv_versions`, `applications`, `application_status_history`, `application_notes`), constraints, indexes, and explicit grants to `authenticated` only.
- `supabase/migrations/20260715085901_functions_and_triggers.sql` — `updated_at` sync, `current_status` sync from status history (ADR-017), append-only enforcement on `application_status_history`, and the `auth.users` → `public.users` signup-mirroring trigger.
- `supabase/migrations/20260715085903_rls_policies.sql` — RLS enabled and policies created for every table.
- `src/types/supabase.ts` — the `Database` type, hand-authored to match the schema exactly (see Deviations).
- `supabase/config.toml`, `supabase/.gitignore` — Supabase CLI project scaffold (`supabase init`).

### Changed

- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` — both now use `createClient<Database>(...)` instead of the untyped client.
- `.env.local` — corrected `NEXT_PUBLIC_SUPABASE_URL`, which had an erroneous `/rest/v1/` suffix that would have caused every Supabase request to double up its path.

### Database design decisions

- **`application_date` is nullable** (deviates from `DATABASE.md`'s literal "Required" — approved in the earlier documentation review): a Wishlist-stage application hasn't been submitted yet. A `CHECK` constraint enforces it's required as soon as `current_status` moves past `Wishlist`.
- **Composite ownership foreign keys**: `applications.company_id`/`cv_version_id` are constrained via `(company_id, user_id) REFERENCES companies (id, user_id)` (and similarly for CV versions), not a plain single-column FK. This guarantees a company/CV referenced by an application always belongs to the same user — a plain FK would only guarantee the row exists, not that it's owned by the right user.
- **No cascade on `applications.company_id`/`cv_version_id`**: deleting a referenced company/CV is blocked by default (`NO ACTION`), matching `BUSINESS_RULES.md`'s "prefer preventing deletion."
- **`current_status` starts at `Wishlist` by default**; the first `application_status_history` row is the responsibility of the Service layer in Phase 8, not a DB trigger — keeps orchestration logic out of the database per `ARCHITECTURE.md`.
- **At-most-one-genesis-row constraint**: a partial unique index on `application_status_history (application_id) WHERE previous_status IS NULL` prevents the append-only lifecycle from ever being corrupted with two disconnected starting points.
- **Explicit `GRANT`s to `authenticated` only** (never `anon`, never `DELETE`): makes the schema self-contained and reproducible on a fresh Supabase project rather than depending on implicit dashboard defaults (ADR-029 reusability).
- **RLS policies use `(select auth.uid())`** rather than bare `auth.uid()` — Supabase's documented performance recommendation (evaluated once per statement instead of per row).
- **Migrations are idempotent**: enums guarded with `DO` blocks checking `pg_type`; tables/indexes use `IF NOT EXISTS`; triggers/policies use `DROP ... IF EXISTS` before recreating — safe to re-run by hand in the SQL Editor.

### Verification

- All three migrations applied successfully to the live Supabase project.
- Schema confirmed via the PostgREST REST API: all 6 tables are reachable at `/rest/v1/<table>` and correctly return `42501 permission denied` for the `anon` role (rather than `PGRST205 table not found`), confirming both that the tables exist and that anonymous access is fully locked out at the grant level, in addition to RLS.
- TypeScript, ESLint, and production build all pass.

---

## Phase 4 — Authentication (2026-07-15)

Register, login, logout, session handling, protected routes, and password reset, per `IMPLEMENTATION_ORDER.md`.

### Added

- `src/config/routes.ts` — centralised route path constants (`CODE_STYLE.md` forbids hardcoded URLs).
- `src/shared/constants/error-codes.ts`, `src/types/action-result.ts` — the `ActionResult<T>` discriminated-union contract every Server Action returns, mirroring `API.md`'s documented response/error-code shape.
- `src/features/auth/schemas/auth.schema.ts` — Zod schemas for login, register, request-password-reset, update-password.
- `src/features/auth/repositories/auth.repository.ts` — the only module that calls `supabase.auth.*` from server code (ADR-008).
- `src/features/auth/repositories/auth-browser.repository.ts` — its client-side counterpart, the only module that calls `supabase.auth.*` from browser code (added during the architecture review below).
- `src/features/auth/services/auth.service.ts` — business logic: translates raw Supabase Auth errors into meaningful messages, handles Supabase's anti-enumeration behavior on both signup (empty `identities` array) and password reset (always returns success regardless of whether the email exists).
- `src/features/auth/services/auth-browser.service.ts` — client-side counterpart (`hasRecoverySession`, `syncSessionFromUrl`).
- `src/features/auth/actions/auth.actions.ts` — `registerAction`, `loginAction`, `logoutAction`, `requestPasswordResetAction`, `updatePasswordAction`.
- `src/features/auth/components/{LoginForm,RegisterForm,ForgotPasswordForm,UpdatePasswordForm,LogoutButton,SupabaseSessionSync}.tsx` — the last one mounted once in the root layout; ensures a signup-confirmation link's session (encoded in the URL) is synced to cookies regardless of which page it lands on.
- `src/app/(auth)/layout.tsx` + `login/`, `register/`, `forgot-password/` pages — centered-card layout that redirects to `/dashboard` if already logged in.
- `src/app/update-password/` (its own layout, deliberately outside `(auth)`) — a recovery session would otherwise be treated as "already logged in" and redirected away before the user can set a new password.
- `src/app/(dashboard)/layout.tsx` — auth guard redirecting to `/login` if unauthenticated. No Sidebar/Top Navigation yet (Phase 5).
- `src/app/(dashboard)/dashboard/page.tsx` — placeholder page proving the protected-route/session/logout flow; the real dashboard is Phase 11.
- shadcn primitives: `input`, `label`, `card`, `field`, `separator` (`button` already existed from Phase 1).

### Changed

- `src/config/env.ts` — added `appUrl` (from `NEXT_PUBLIC_APP_URL`, falls back to `http://localhost:3000`), used to build the password-reset redirect URL.
- `src/app/layout.tsx` — added a title template (`%s | JobTracker Insights`) and mounted `SupabaseSessionSync`.

### Technical decisions

- **New dependencies**: `zod` (ADR-009), `react-hook-form` (ADR-010), `@hookform/resolvers` (the standard glue between them, not a discretionary extra).
- **shadcn's `form.tsx` no longer exists in the current CLI/registry** (`base-nova` style) — it's been replaced by a framework-agnostic `field.tsx` (`Field`, `FieldLabel`, `FieldError`, etc.) with no built-in react-hook-form binding. Forms are wired manually via `register()` instead of the classic `<FormField control={...} render={...}>` wrapper.
- **Full layered chain even for reads**: `ARCHITECTURE.md` explicitly forbids `UI → Repository`. Even the "is there a logged-in user" check used by both protected layouts goes through `AuthService.getCurrentUser() → AuthRepository.getUser()`, not a direct Supabase call in the component.
- **Password reset flow**: Supabase's default (unconfigured) email templates redirect back to the app with the session in a URL hash fragment, visible only to the browser. `UpdatePasswordForm` and `SupabaseSessionSync` trigger that hash processing via `AuthBrowserService`/`AuthBrowserRepository` (a client-side counterpart to the server `AuthService`/`AuthRepository`, added during the architecture review below); the actual password update still goes through the normal Server Action → Service → Repository chain using the server client.
- **Minimum password length**: 8 characters. `FEATURES.md` only says "minimum security requirements" without a number; Supabase's own default is 6.

### Verification

- TypeScript, ESLint, and production build all pass.
- Live browser smoke test (Playwright against the dev server): `/dashboard` redirects to `/login` when logged out; `/login`, `/register`, `/forgot-password` render correctly with working client-side validation; `/update-password` correctly shows "invalid or expired" with no recovery session; registering with an obviously-fake domain (`@example.com`) is rejected by Supabase itself, correctly mapped to a friendly message; registering with a realistic domain reaches Supabase's actual signup call and correctly surfaces a friendly rate-limit message once Supabase's free-tier email quota was hit from repeated test attempts. No console errors or hydration warnings on any page. See `KNOWN_ISSUES.md` for what this did *not* cover.

### Architecture review (post-implementation)

A dedicated pass against `ARCHITECTURE.md` found two real violations of "no React component accesses Supabase directly" (ADR-008): `UpdatePasswordForm.tsx` called `supabase.auth.getSession()` directly, and `SupabaseSessionSync.tsx` imported the browser client factory directly. Fixed by adding a client-side counterpart to the server repository/service pair:

- `src/features/auth/repositories/auth-browser.repository.ts` (`AuthBrowserRepository`) — the only module allowed to call `supabase.auth.*` from browser code.
- `src/features/auth/services/auth-browser.service.ts` (`AuthBrowserService`) — `hasRecoverySession()`, `syncSessionFromUrl()`.

Both components now call `AuthBrowserService` instead. Kept as separate files from the server-side `AuthRepository`/`AuthService` rather than merged, since a Client Component importing a module that transitively pulls in `next/headers` (via the server Supabase client) would break the build.

`SupabaseSessionSync` was also moved from `src/shared/components/` to `src/features/auth/components/`: it depends on the auth feature's service, and `shared/` depending on a feature would invert `ARCHITECTURE.md`'s intended dependency direction (features depend on shared, not the reverse).

All other criteria checked clean: no page contains business logic (layouts only make a redirect decision based on an already-computed auth state — routing plumbing, not a business rule); every database access goes through `Service → Repository` (verified by grep — `AuthRepository`/`AuthBrowserRepository` are each imported from exactly one place); Server Actions only validate, delegate to a Service, and redirect on the result — all error-translation and anti-enumeration logic lives in the Service layer; validation is centralized in one schema file (`auth.schema.ts`), imported identically by both the Server Actions and the client forms' `zodResolver`; no duplicated auth logic (`getCurrentUser`, `toFriendlyAuthError`, session-check logic are each defined exactly once).

---

## Phase 5 — Shared UI (2026-07-16)

Reusable UI kit, per `IMPLEMENTATION_ORDER.md`: Main Layout, Sidebar, Top Navigation, Theme Toggle, Buttons, Forms, Inputs, Dialogs, Toasts, Tables, Loading Components, Empty States. No new feature pages - `/applications`, `/companies`, `/cv-versions`, `/analytics`, `/settings` are now linked from the sidebar but 404 until their own phases build them.

### Added

- shadcn primitives: `textarea`, `select`, `combobox` (+ `input-group`), `dialog`, `alert-dialog`, `sheet`, `dropdown-menu`, `table`, `skeleton`, `spinner`, `sonner`, `checkbox`.
- `src/config/navigation.ts` (`NAV_ITEMS`) — single source of truth for sidebar links and the top nav's current-page-title lookup.
- `src/shared/components/ThemeProvider.tsx`, `ThemeToggle.tsx` — dark/light mode (UI_SYSTEM.md "Dark Mode: Required", persisted across sessions).
- `src/shared/components/layout/{SidebarNav,Sidebar,MobileSidebar,TopNav,MainLayout}.tsx` — the app shell. Fully generic: `footer`/`userMenu` are slots the caller fills in, so none of these import anything from `features/`.
- `src/features/auth/components/UserMenu.tsx` — the one genuinely auth-specific piece of the shell (email + logout dropdown); lives in the feature, not `shared/`.
- `src/shared/components/DataTable.tsx` — generic sortable/paginated/selectable table (hand-rolled, no table library - see Technical decisions). Filtering is deliberately not built in; callers pass pre-filtered data.
- `src/shared/components/EmptyState.tsx`, `ConfirmDialog.tsx`.

### Changed (additive only, per ADR-012 - no existing usage broken)

- `src/shared/components/ui/button.tsx` — added a `loading` prop (shows a spinner, forces `disabled`).
- `src/shared/components/ui/field.tsx` (`FieldLabel`) — added a `required` prop (renders a `*` indicator).
- `src/app/(dashboard)/layout.tsx` — now wraps `children` in `MainLayout`, composing `LogoutButton`/`UserMenu` in (the app layer is where feature composition belongs).
- `src/app/(dashboard)/dashboard/page.tsx` — removed its own `LogoutButton` now that the shell provides logout via the Sidebar and UserMenu (would otherwise show three logout affordances on one screen).
- `src/app/layout.tsx` — mounted `ThemeProvider` and `Toaster`, added `suppressHydrationWarning` to `<html>` (required by next-themes' pre-hydration script).

### Technical decisions

- **`next-themes` present, hand-rolled ThemeProvider dropped**: it arrived as an unavoidable transitive dependency of shadcn's own `sonner.tsx` recipe (hardcodes `useTheme()` from `next-themes` to sync toast colors). Since it's present either way, `ThemeProvider` wraps it directly rather than shipping a redundant parallel theme system.
- **No table library** (`@tanstack/react-table` etc.): given how consistently "minimize dependencies" came up in this project, `DataTable` is hand-rolled — a bounded, well-understood problem for a client-side array, not something that risks spiraling.
- **shadcn's classic `form.tsx` doesn't exist in this registry version** — already noted in Phase 4; Phase 5's non-auth forms would follow the same manual `register()` + `Field`/`FieldError` pattern if any existed yet (none do).

### Architecture enforcement (continuous, per instruction)

- All new `shared/` components checked via grep for `@/features` imports before and after each addition — zero found.
- `UserMenu` was deliberately placed in `features/auth/components/`, not `shared/components/`, specifically because it needs the auth feature's `logoutAction`/email — the case the instruction called out directly.
- `SidebarNav`/`Sidebar`/`MobileSidebar`/`TopNav`/`MainLayout` take `footer`/`userMenu` as `ReactNode` props rather than importing `LogoutButton`/`UserMenu` themselves, so the composition happens at the app layer (`(dashboard)/layout.tsx`), keeping `shared/` fully feature-agnostic.

### Verification

- TypeScript, ESLint, and production build all pass.
- Live browser test (Playwright, desktop + mobile viewports) against a temporary unprotected preview route (deleted before finishing — real verification required a rendered `MainLayout`, but reaching `/dashboard` needs a confirmed account, and this Supabase project has email confirmation enabled with no way to click the link here): Sidebar, TopNav, search box, theme toggle (including dark mode), mobile drawer (Sheet), DataTable (sorting, pagination, selection, empty state), and ConfirmDialog all render and behave correctly with zero console errors.
- **Found and fixed a real bug via this testing, not caught by TypeScript**: `UserMenu`'s `DropdownMenuLabel` threw a runtime error ("MenuGroupContext is missing") because this Base UI-based shadcn version requires `DropdownMenuLabel` to be wrapped in `DropdownMenuGroup` — unlike the classic Radix version. Fixed by wrapping it; re-tested clean.

---

## Phase 6 — Company Management (2026-07-17)

CRUD, search, validation, and archive for companies, per `IMPLEMENTATION_ORDER.md`. Priority for this phase, per instruction: business correctness → data integrity → architecture compliance → UX → visual polish.

### Added

- `supabase/migrations/20260716222143_case_insensitive_company_names.sql` — see "Business rules implemented" below.
- `src/features/companies/{types,schemas,repositories,services,actions}/company.*` — the full Repository → Service → Server Action chain.
- `src/features/companies/components/{CompanyForm,CompanyFormDialog,CompanyCreateButton,CompaniesTable,CompanySearchBar}.tsx`.
- `src/app/(dashboard)/companies/page.tsx` — server-rendered, server-side search + pagination.

### Changed

- `src/features/auth/services/auth.service.ts` — wrapped `getCurrentUser` in React's `cache()`. The `(dashboard)` layout and the new companies page both need the current user in the same request; without memoization that's a duplicate Supabase call per request (`ARCHITECTURE.md` "avoid duplicate queries"). No behavior change, purely additive.

### Business rules implemented

- **"Companies are unique per user"** (`BUSINESS_RULES.md`): enforced twice — a `CompanyService` pre-check (`findActiveByName`) returns a friendly error in the common case, and the database's partial unique index is the actual, race-safe enforcement (a Postgres `23505` from the fallback path is caught and mapped to the same message).
- **Case-insensitive duplicate detection (deviation, see below)**: found while implementing the rule above that the Phase 3 index compared raw `name`, so "Google" and "google" would've been accepted as two different companies — silently fragmenting that company's analytics. Added a migration replacing the index with one on `lower(name)`.
- **"A company cannot be deleted if applications reference it... Prefer preventing deletion"**: `CompanyService.archive` counts the user's active (non-deleted) applications referencing the company before archiving; if any exist, the archive is rejected with `"This company is currently referenced by N application(s). Remove or reassign them before archiving."` — matching the exact error-message style `BUSINESS_RULES.md`'s "Error Handling" section shows for CV versions. Since no `Application` feature exists yet (Phase 8), this path can't be exercised with real data yet, but the logic is in place now so Phase 8 doesn't need to revisit it.
- **Soft delete only**: archiving sets `deleted_at`; nothing ever issues a hard `DELETE`.
- **Auditability** (`BUSINESS_RULES.md`): rejected and successful archive attempts are logged (`console.warn`/`console.info`) — no dedicated audit-log table exists in `DATABASE.md`, so Vercel/Supabase's log capture is the mechanism, consistent with `DEPLOYMENT.md`'s "Monitoring" section.
- **Search**: case-insensitive, partial match (`ILIKE %query%`), scoped to the owner via RLS + explicit `user_id` filter.
- **Ownership**: every repository query filters by `user_id` in addition to RLS (defense in depth), consistent with the auth feature's established pattern.

### Technical decisions

- **Server-side pagination, not `DataTable`'s built-in client-side pagination**: `API.md` documents `page`/`limit` as a general collection-endpoint contract, and `ARCHITECTURE.md`/`BUSINESS_RULES.md` both say to prefer SQL-side work over loading everything into memory. `CompanyService.list` fetches only the requested page via `.range()`; `DataTable` is handed exactly one page's worth of rows (`pageSize` = the page limit), so its own pagination UI never activates. Page-level Prev/Next controls (plain `Link`s to `?page=N`) sit outside `DataTable`, which is unmodified from Phase 5.
- **Sorting stays client-side, over the current page only**: unlike search/pagination, sorting isn't a documented requirement for the Companies page (`UI_SYSTEM.md` doesn't list it, unlike Applications' explicit "Sorting" business rule), so per-page client-side sorting via `DataTable` is a reasonable convenience layer, not a corner cut on a real requirement.
- **`listCompaniesSchema` validates the page's `searchParams`** (`page`/`limit`/`query` from the URL, genuinely untrusted input) using `.catch()` fallbacks rather than hard failures — a malformed `?page=abc` degrades to page 1 instead of breaking the page, appropriate for a read rather than a mutation.
- **Hand-rolled debounce in `CompanySearchBar`** (a `setTimeout`/`useRef`, no `use-debounce` package) — consistent with this project's repeated "minimize dependencies" instruction; the problem is small and bounded.

### Verification

- TypeScript, ESLint, and production build all pass.
- Live browser test (Playwright): table rendering, sorting, the edit dialog (pre-filled fields, required-field indicator), inline validation (clearing the required name field surfaces "Company name is required."), and the archive confirmation dialog (correct company name interpolated, destructive styling) — all verified against a temporary route rendering `CompaniesTable` with mock data, then deleted. Zero console errors.
- **Not verified**: the real Server Actions against live data (create/update/archive actually hitting Supabase, the duplicate-name rejection, the case-insensitive index). Same root cause as Phases 4–5 — this Supabase project requires email confirmation and there's no way to click a confirmation link in this environment, so no confirmed test account exists to drive a real authenticated request. The business logic was verified via careful code review instead; see `KNOWN_ISSUES.md`.

### Deviations from the documentation

- **`DATABASE.md`'s companies index refined, not just extended**: the case-insensitive uniqueness fix (above) changes the actual index definition from Phase 3, rather than purely adding new schema. This is a correction to make the implementation match the documented business rule's evident intent, not a change to the rule itself — flagging it explicitly since `IMPLEMENTATION_RULES.md` requires schema changes to be deliberate and documented.
- Everything else matches `FEATURES.md` Feature 3, `API.md`'s Companies section, and `UI_SYSTEM.md`'s Companies Page exactly (Table, Search, Create, Edit, Archive).

### Final business architecture review (post-implementation)

A dedicated pass verifying "every business rule exists in exactly one place" found one real duplication: `validationError` (a helper turning a failed Zod parse into an `ActionResult`) was defined identically in both `auth.actions.ts` and `company.actions.ts`. Extracted to `src/shared/utils/action-result.ts` (generic - takes a plain string, no feature knowledge). Also proactively extracted `requireUserId` (the "authenticate before calling the Service" guard) from `company.actions.ts` into `AuthService.requireUserId()`: it wasn't literally duplicated yet since only one feature had it, but it's the same category of helper every future feature's Server Actions will need, so centralizing it now avoids the same fix repeating later. Both Server Action files re-verified as orchestration-only afterward; Repository/Service/Component boundaries all confirmed clean on this pass (no fixes needed there).

---

## Phase 7 — CV Version Management (2026-07-18)

CRUD, validation, and archive for CV versions, per `IMPLEMENTATION_ORDER.md`. Priority for this phase: business correctness → data integrity → architecture compliance → UX → visual polish. Implemented as a deliberate mirror of the Phase 6 Companies feature — same Repository → Service → Server Action → page shape, reusing the same generic infrastructure (`DataTable`, `ConfirmDialog`, `EmptyState`, `AuthService.requireUserId`, `validationError`, `ActionResult`, `ERROR_CODES`).

### Added

- `supabase/migrations/20260718120000_case_insensitive_cv_version_names.sql` — see "Business rules implemented" below.
- `src/features/cv/{types,schemas,repositories,services,actions}/cv-version.*` — the full Repository → Service → Server Action chain.
- `src/features/cv/components/{CVVersionForm,CVVersionFormDialog,CVVersionCreateButton,CVVersionsTable}.tsx`.
- `src/app/(dashboard)/cv-versions/page.tsx` — server-rendered, server-side pagination.

### Business rules implemented

- **"CV names must be unique per user"** (`FEATURES.md` Feature 4): enforced twice — a `CVVersionService` pre-check (`findActiveByName`) returns a friendly error in the common case, and the database's partial unique index is the actual, race-safe enforcement (a Postgres `23505` from the fallback path is caught and mapped to the same message). Identical pattern to companies.
- **Case-insensitive duplicate detection (deviation, see below)**: the Phase 3 `cv_versions` unique index compared raw `name`, so "Backend" and "backend" would have been accepted as two different CV versions — silently fragmenting that CV's future analytics. Added a migration replacing the index with one on `lower(name)`, mirroring the equivalent fix applied to companies in Phase 6.
- **"A CV version cannot be deleted while applications reference it"** (`BUSINESS_RULES.md` "CV Rules"): `CVVersionService.archive` counts the user's active (non-deleted) applications referencing the CV before archiving; if any exist, the archive is rejected with `"This CV version is currently used by N application(s). Remove or reassign them before archiving."` — matching the exact error-message style `BUSINESS_RULES.md`'s "Error Handling" section shows for CV versions ("This CV version is currently used by 14 applications."). Since no `Application` feature exists yet (Phase 8), this path can't be exercised with real data yet, but the logic is in place now so Phase 8 doesn't need to revisit it.
- **Soft delete only**: archiving sets `deleted_at`; nothing ever issues a hard `DELETE` (`ADR-021`, `BUSINESS_RULES.md` "Soft Deletes").
- **Auditability** (`BUSINESS_RULES.md`): rejected and successful archive attempts are logged (`console.warn`/`console.info`) — consistent with the companies feature; no dedicated audit-log table exists in `DATABASE.md`, so log capture is the mechanism.
- **Ownership**: every repository query filters by `user_id` in addition to RLS (defense in depth), consistent with the established pattern.

### Technical decisions

- **No search on the CV Versions page**: unlike companies, neither `FEATURES.md` Feature 4 (Create / Rename / Archive / List), `API.md`'s `GET /cv-versions` ("Returns all CV versions", no "Supports search"), nor `UI_SYSTEM.md`'s CV Versions Page ("Simple management interface. List. Create. Edit. Archive.") lists search. Omitted it to stay within documented scope (`IMPLEMENTATION_RULES.md` "Scope Control"). No `CVVersionSearchBar` component was created, and `CVVersionRepository.list` takes no `query` parameter.
- **Pagination retained**: `API.md`'s "Pagination" section documents `page`/`limit` as a general contract for *every* collection endpoint, so `CVVersionService.list` fetches only the requested page via `.range()` and the page renders plain `Link`-based Prev/Next controls — the same generic infrastructure companies use, not a parallel pattern.
- **Sorting stays client-side, over the current page only**: not a documented requirement for CV versions, so per-page client-side sorting via `DataTable` is a convenience layer, not a corner cut.
- **Feature folder is `src/features/cv/`** (per `ARCHITECTURE.md`'s Features Directory listing, which names the folder `cv/`), while the route and files use the fuller `cv-version`/`CVVersion` naming that `CODE_STYLE.md` establishes (`deleteCVVersionAction()`).
- **`description` uses a `Textarea`** (multi-line, optional) — the one UI difference from the company form; `CVVersion` has only `name` + `description` per `DATABASE.md`.
- **`listCVVersionsSchema` validates the page's `searchParams`** (`page`/`limit` from the URL, untrusted input) using `.catch()` fallbacks rather than hard failures — a malformed `?page=abc` degrades to page 1 instead of breaking a read.

### Verification

- TypeScript (via `next build`'s type-checking step), ESLint, and the production build all pass with zero errors. `/cv-versions` is registered as a dynamic route.
- Architecture scan: no `@/features` imports inside `shared/`; no Supabase access anywhere outside `repositories/`; the new feature reuses shared infrastructure with no duplicated logic.
- **Not verified**: the real Server Actions against live data (create/update/archive actually hitting Supabase, the duplicate-name rejection, the case-insensitive index). Same root cause as Phases 4–6 — this Supabase project requires email confirmation and there is no way to click a confirmation link in this environment, so no confirmed test account exists to drive a real authenticated request. The business logic was verified via code review against the (already browser-verified) companies feature it mirrors; see `KNOWN_ISSUES.md`.

### Deviations from the documentation

- **`DATABASE.md`'s `cv_versions` index refined, not just extended**: the case-insensitive uniqueness fix (above) changes the actual index definition from Phase 3, rather than purely adding new schema. This is a correction to make the implementation match the documented business rule's evident intent ("CV names must be unique per user"), not a change to the rule itself — flagged explicitly since `IMPLEMENTATION_RULES.md` requires schema changes to be deliberate and documented. Identical in kind to the companies fix accepted in Phase 6.
- Everything else matches `FEATURES.md` Feature 4, `API.md`'s CV Versions section, and `UI_SYSTEM.md`'s CV Versions Page exactly (List, Create, Edit, Archive).

### Final business architecture review (post-implementation)

A dedicated pass verifying "every business rule exists in exactly one Service" (`ARCHITECTURE.md` "Business Rule Ownership") found no new duplication. The uniqueness rule, the archive-blocking rule, the soft-delete rule, and normalization all live exclusively in `CVVersionService`; the Server Actions only authenticate → validate → delegate → `revalidatePath`; the Repository only persists; components only render. The shared helpers extracted during Phase 6's review (`validationError`, `AuthService.requireUserId`, `ActionResult`, `ERROR_CODES`, `DataTable`, `ConfirmDialog`, `EmptyState`) were reused as-is with no changes needed — confirming that centralization paid off exactly as intended and no parallel pattern was introduced.

---

## Phase 7 Follow-up — Infrastructure Deduplication (2026-07-18)

Small, scoped refactor from a post-implementation review of Phase 7: extracted the two genuinely infrastructure-level pieces duplicated between `CompanyService` and `CVVersionService`, per explicit instruction to extract *only* infrastructure duplication and leave feature-specific business messages alone.

### Added

- `src/shared/utils/normalize.ts` — `normalize()`, moved here verbatim (empty optional-string → `null`, matching `DATABASE.md`'s nullable columns). Feature-agnostic: no knowledge of companies or CV versions.
- `src/shared/constants/postgres-error-codes.ts` — `POSTGRES_ERROR_CODES.UNIQUE_VIOLATION` (Postgres code `23505`), moved here verbatim. Separate from `ERROR_CODES` (this app's own business-error taxonomy) since it's a raw database vendor code, not a business error.

### Changed

- `src/features/companies/services/company.service.ts`, `src/features/cv/services/cv-version.service.ts` — both now import `normalize` and `POSTGRES_ERROR_CODES` from `shared/` instead of defining them locally. No behavior change.

### Explicitly not touched (by instruction)

- `duplicateNameError()` remains defined separately inside each Service. It carries feature-specific message text ("A company named..." vs. "A CV version named...") and belongs to each feature's own domain language — extracting it into a generic "entity conflict" abstraction was explicitly rejected to avoid a premature generic-entity pattern (ADR-028 Simplicity).
- The archive-blocking "count active applications by FK" shape (`CompanyService.archive` / `CVVersionService.archive`) was left alone — noted in the Phase 7 review as a *future* candidate once Phase 8 gives it a third, real caller, not something to generalize speculatively now.

### Verification

- Production build, TypeScript (via `next build`), ESLint, and Prettier all pass with zero errors after the refactor.
- Re-verified: no `@/features` imports inside `shared/`; no Supabase access outside `repositories/`; `normalize`/`POSTGRES_ERROR_CODES` no longer duplicated in either service; `duplicateNameError` confirmed still present, unmodified, in both.

---

## Phase 8 — Application Management (2026-07-18)

Create/Edit/Archive, Search, Filtering, Sorting, and Pagination for job applications, per `IMPLEMENTATION_ORDER.md` — the core feature. Built as a deliberate extension of the Companies/CV Versions reference implementation (Repository -> Service -> Server Action -> page shape, same shared infrastructure), diverging only where Applications has genuinely different requirements (relational fields, enums, richer filtering, real server-side sorting, cross-feature validation).

### Added

- `src/features/applications/{types,constants,schemas,repositories,services,actions}/*` - the full Repository -> Service -> Server Action chain, plus `application-status-history.repository.ts` (see "Business rules implemented").
- `src/features/applications/components/{ApplicationForm,ApplicationFormDialog,ApplicationCreateButton,ApplicationFilterBar,ApplicationsTable}.tsx`.
- `src/app/(dashboard)/applications/page.tsx` - server-rendered, server-side search + filtering + sorting + pagination.
- `CompanyRepository.findActiveById` / `CVVersionRepository.findActiveById` - small mirrors of the existing `findActiveByName`, added to support Applications' cross-feature reference validation (see below).
- `POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION` / `.CHECK_VIOLATION` in `src/shared/constants/postgres-error-codes.ts` - extending the constant added in the Phase 7 follow-up, same infra-level rationale.

### Business rules implemented

- **Required/optional fields** (`FEATURES.md` Feature 5): Company, CV Version, Position required; Location, Job URL, Employment Type, Work Mode, Salary Range, Source optional. `current_status`, `response_date`, `offer_salary`, `rejection_reason` are deliberately absent from the form - they belong to Phase 9 (Status Tracking) and `current_status` must never be manually edited (`ADR-017`).
- **"Must reference an existing company... existing CV version"** (`BUSINESS_RULES.md` "Applications"): a plain FK only guarantees the row exists, not that it belongs to this user or is still active. `ApplicationService`'s `validateReferences` calls the new `findActiveById` on both `CompanyRepository` and `CVVersionRepository` before every create/update, rejecting archived or foreign-owned references with a friendly message - this is a genuinely new requirement Companies/CV Versions never had (they don't reference other user-owned entities), so it's the one place this phase adds new repository methods rather than only reusing existing ones.
- **Status History genesis row** (`BUSINESS_RULES.md` "Status History": "Every status change must generate a history record"; `ADR-017`): every new application gets a `previous_status: null, new_status: 'Wishlist'` row via the new `ApplicationStatusHistoryRepository.createGenesis`, immediately after insert. This was flagged as required reading Phase 3's migration comments (`supabase/migrations/20260715085856_enums_and_tables.sql`: "the first application_status_history row is the responsibility of the Service layer in Phase 8") - easy to miss since Status Tracking itself is Phase 9, but this specific insert is a byproduct of *creation*, not of a *transition*, and was explicitly pre-assigned to this phase.
- **Soft delete only**: archiving sets `deleted_at`; no hard `DELETE`. Unlike Companies/CV Versions, no reference-count guard is needed on archive - nothing points *to* an application in a way that blocks its own deletion.
- **Search** (`BUSINESS_RULES.md`): case-insensitive partial match on Position. Company-name search is intentionally deferred - see "Deviations".
- **Filtering** (`BUSINESS_RULES.md` + `API.md`, unioned - see "Deviations"): Status, Company, CV Version, Source, Work Mode, Employment Type, Application Date range, Salary Range - all combinable (`AND`), each independently toggled via URL params.
- **Sorting** (`BUSINESS_RULES.md` + `API.md`): Application Date, Company, Position, Status, Last Updated - real server-side `ORDER BY` across the *entire* filtered result set, not just the current page (see "Technical decisions" for why this differs from Companies/CV Versions).
- **Pagination**: identical `page`/`limit` contract (`API.md`), max `limit` 100.
- **Auditability**: archive attempts logged (`console.info`); genesis-history failures logged (`console.error`).
- **Ownership**: every repository query filters by `user_id` in addition to RLS.

### Technical decisions

- **Server-side sorting, not `DataTable`'s per-page client sort**: Companies/CV Versions use `DataTable`'s built-in click-header-to-sort, which only reorders the *currently fetched page* - harmless there because sorting isn't a hard requirement for those two features. Applications has a **documented hard requirement for both pagination and sorting simultaneously**, and per-page-only sorting would silently mislead users (page 2 sorted only among its own 20 rows, not the true global order). `ApplicationsTable` therefore marks no column `sortable`; `ApplicationFilterBar` owns a "Sort by" `Select` + direction toggle that round-trips through the URL and a real `ORDER BY`, exactly matching the pagination round-trip already established.
- **Sort/display by Company or CV Version name uses a `!inner` embedded-resource query** (`companies!inner(name), cv_versions!inner(name)` in `ApplicationRepository`'s list select), safe because both FKs are `NOT NULL` (every application always has exactly one matching row on each side, so the inner join never drops a row). `!inner` is what makes Supabase-js's `.order(column, { referencedTable })` actually reorder the parent rows instead of only reordering within each row. **Not verified against a live Supabase instance** - see `KNOWN_ISSUES.md` for the specific risk (composite FK embedding) and the documented fallback.
- **Free-text search covers Position only, not Company name** (deviation from `BUSINESS_RULES.md`'s literal "Search fields: Company, Position..." - see "Deviations" below for the reasoning).
- **Salary Range filter uses interval-overlap semantics**: `salary_min` (if given) matches applications whose own `salary_max >= salary_min` (their range reaches at least that amount); `salary_max` (if given) matches applications whose own `salary_min <= salary_max` (their range stays at or below that amount). Neither `BUSINESS_RULES.md` nor `API.md` specifies exact comparison semantics for this filter; this is a reasonable, explicit operationalization of an already-approved rule, not an invented one.
- **Filters = union of `BUSINESS_RULES.md`'s and `API.md`'s two overlapping-but-not-identical lists** (`BUSINESS_RULES.md` includes Salary Range but not Employment Type; `API.md` includes Employment Type but not Salary Range) - implemented both, since the two lists don't actually contradict each other, just enumerate a shared underlying set incompletely.
- **`shared/components/ui/select.tsx` (Base UI `Select`) used for the Company/CV Version pickers and every enum field**, wired via react-hook-form's `Controller` (a first-time integration in this codebase - Companies/CV Versions only ever needed plain `register()` on text inputs). `Combobox` (also unused elsewhere) was considered for the Company/CV Version pickers for its search-as-you-type UX, but rejected for Phase 8: neither component has an established usage pattern in this codebase to mirror, and `Select`'s API is the simpler, lower-risk one to integrate correctly on the first try. Company/CV Version lists are capped at 100 (matching the project's existing pagination ceiling), a reasonable MVP bound for a plain (non-searchable) dropdown.
- **`useForm` needs distinct input/output generics** (`useForm<ApplicationFormValues, unknown, CreateApplicationInput>` in `ApplicationForm`): `createApplicationSchema` uses `z.coerce.number()` for `salary_min`/`salary_max`, which react-hook-form v7's resolver typing requires modeling as a separate pre-parse "input" shape (`z.input<typeof schema>`) from the post-parse "output" shape used by `onSubmit`. Neither Companies nor CV Versions hit this, since neither has a coerced numeric form field.
- **`ApplicationListParams` field names match `listApplicationsSchema`'s output verbatim** (snake_case: `company_id`, `date_from`, `sort_by`, ...), so the page passes the parsed `searchParams` straight through to `ApplicationService.list` with no translation layer - the same minimal-transformation approach Companies/CV Versions use for their simpler list params.
- **`ApplicationStatusHistoryRepository` is a deliberately minimal seed**, exposing only `createGenesis` - no listing, no transition validation. Phase 9 (Status Tracking) is expected to *extend* this same file rather than replace it, per this session's standing instruction to reuse and extend rather than parallel-implement.
- **Application Detail page (`UI_SYSTEM.md` "Application Detail": General Information, Current Status, Status History, Notes, Actions) was not built.** Its two largest sections (Status History, Notes) depend entirely on Phase 9 and Phase 10, which don't exist yet; a stub page showing only "General Information" would be half-finished rather than genuinely useful. Create/Edit instead reuse the same dialog-based pattern as Companies/CV Versions, matching `UI_SYSTEM.md`'s Applications Page spec (Table, Filters, Search, Create button, Pagination - no separate detail route mentioned there).

### Verification

- Production build, TypeScript (via `next build`), ESLint, and Prettier all pass with zero errors. `/applications` is registered as a dynamic route.
- Architecture scan: no `@/features` imports inside `shared/`; no Supabase access outside `repositories/`; no component imports a repository directly; no `any` introduced.
- **Not verified**: real Server Actions against live data, and specifically the `!inner` embedded-resource query against `applications`' composite foreign keys (`(company_id, user_id) -> companies(id, user_id)`) - same root cause as every prior phase (no confirmed test account reachable from this environment), compounded here by a genuine technical unknown around composite-FK embedding. See `KNOWN_ISSUES.md` for the specific risk and fallback plan.

### Self-review fixes (before closing the phase)

A dedicated re-read of every new file, done as if reviewing another engineer's PR, caught two real issues before considering the phase complete:

- **`currency` validation rejected an emptied field**: the original Zod schema used `.length(3, "...")`, which fails on an empty string (length 0), even though `ApplicationService` was written to treat a blank currency as "use `DEFAULT_CURRENCY`." A user clearing the currency input would have hit a confusing "must be exactly 3 characters" error instead of getting the intended default. Fixed by loosening it to `.max(10).optional()`, matching every other optional text field in this codebase (validation stays permissive; normalization/defaulting is the Service's job).
- **Redundant `ApplicationFields` interface removed**: it `Omit`-then-redeclared four fields from `CreateApplicationInput` with the exact same types, producing a type identical to `CreateApplicationInput` itself (confirmed against `tsconfig.json`'s default `exactOptionalPropertyTypes: false`) - unnecessary indirection with no behavioral difference. `ApplicationService` now uses `CreateApplicationInput` directly.

Also identified (not fixed - see `KNOWN_ISSUES.md`): editing an application whose Company/CV Version was since archived shows an empty picker, since the dropdown only lists active options. Safe (server-side validation still rejects an unresolved reference on submit) but a minor, documented UX gap.

### Deviations from the documentation

- **"Duplicate application" omitted** (`FEATURES.md` Feature 5 lists it as a functional requirement; `IMPLEMENTATION_ORDER.md`'s Phase 8 task list - "Create applications. Edit applications. Archive applications. Search. Filtering. Sorting. Pagination." - does not; `API.md` documents no corresponding endpoint either). Treated `IMPLEMENTATION_ORDER.md`'s explicit, itemized task list as the binding scope for *this phase* and flagged the gap here rather than silently expanding scope, consistent with `IMPLEMENTATION_RULES.md` "Scope Control" and the precedent set in Phase 7 (CV Versions' Search was similarly omitted because `FEATURES.md` Feature 4 didn't list it).
- **`application_date` is optional on the create/edit form**, not required (deviates from `BUSINESS_RULES.md`'s and `FEATURES.md`'s literal "Required Fields" lists). This continues, rather than introduces, the deviation `DATABASE.md`/Phase 3 already made and documented: `application_date` is nullable at the schema level specifically because "a Wishlist-stage application has not been submitted yet," required only once `current_status` moves past Wishlist (enforced by `applications_date_required_after_wishlist_check`). Since Phase 8 can only ever create applications at `Wishlist` (status transitions are Phase 9, and `current_status` must never be set directly), every application this phase creates satisfies that constraint trivially with or without a date - so the form correctly leaves it optional rather than fighting the schema's own already-approved design.
- **"Response Time" omitted from Sorting** (`BUSINESS_RULES.md` lists it as a sortable field): it isn't a stored column (it's `response_date - application_date`, a computed value), and BUSINESS_RULES.md's own "Analytics Rules" section frames response-time-style calculations as Analytics Engine territory (Phase 12), not a plain list-sort. Sorting here covers the four other documented fields plus Company.
- **Genesis status-history insert is best-effort, not atomic with application creation**: no multi-statement transaction or Postgres function/RPC exists yet (introducing one wasn't approved and isn't required by any current phase), so a failure on the second insert is only logged, not rolled back. Flagged in `KNOWN_ISSUES.md`.

### Final business architecture review (post-implementation)

Verified every business rule exists in exactly one place: uniqueness-style checks don't apply to Applications (no unique-name constraint), but the FK-ownership/active validation, the genesis-history insert, and the salary/date constraint-violation mapping all live exclusively in `ApplicationService`. Repositories (`ApplicationRepository`, `ApplicationStatusHistoryRepository`) contain no decisions - only persistence and the interval-overlap/embedded-sort query construction, which is mechanical query-building, not a business rule. Server Actions are orchestration-only. Components contain no business logic. No parallel CRUD pattern was introduced - `ApplicationForm`/`ApplicationFormDialog`/`ApplicationCreateButton` are structurally identical to their Companies/CV Versions counterparts; the only new pattern (`Controller`-wired `Select`, `ApplicationFilterBar`) exists because Applications genuinely has fields and requirements (relations, enums, combinable multi-field filtering, real sorting) that the two simpler features do not.

---

## Phase 9 — Status Tracking (2026-07-18)

Status transitions, status history, transition validation, and a timeline UI, per `IMPLEMENTATION_ORDER.md`. This phase also introduces the Application Detail page (`UI_SYSTEM.md` "Application Detail"), deliberately deferred in Phase 8 since its two largest sections (Current Status, Status History) had nothing to show until this phase existed.

### Added

- `src/features/applications/services/application-status.service.ts` - `ApplicationStatusService`, a sibling to `ApplicationService` mirroring the repository split Phase 8 already established (`ApplicationRepository` vs. `ApplicationStatusHistoryRepository`): one file per sub-concern within the same feature.
- `src/features/applications/actions/application-status.actions.ts` - `changeApplicationStatusAction`.
- `src/features/applications/components/{ApplicationStatusTimeline,ChangeApplicationStatusDialog,ApplicationDetailActions}.tsx`.
- `src/app/(dashboard)/applications/[id]/page.tsx` - the Application Detail page (first dynamic route in the app): General Information, Current Status, Status Timeline, Actions (Change Status / Edit / Archive).
- `ApplicationRepository.findById`, `ApplicationService.getById` - the "Get Application" read (`API.md`) that no prior phase needed until a Detail page existed to use it.
- `ApplicationStatusHistoryRepository.createTransition` / `.listByApplication` - extending the repository Phase 8 seeded with only `createGenesis`, exactly as that phase's CHANGELOG said Phase 9 would.
- `APPLICATION_STATUS_TRANSITIONS`, `needsApplicationDateForTransition` in `application.constants.ts`; `ApplicationStatusHistoryEntry` type; `changeApplicationStatusSchema` (reusing the existing `application_date` field schema and not-in-future refinement, now extracted so both `createApplicationSchema` and this one share one definition).
- `config/routes.ts`: `applicationDetailRoute(id)` helper (first dynamic-route builder in the app).
- `lib/utils.ts`: `formatDateTime` - the app's first user-local-timezone timestamp formatter (`BUSINESS_RULES.md` "Time").

### Business rules implemented

- **Allowed State Transitions** (`BUSINESS_RULES.md`): `APPLICATION_STATUS_TRANSITIONS` encodes the exact transition graph, including implicitly rejecting every "Invalid examples" case (e.g. `Accepted → Applied`, `Wishlist → Offer`) simply by never listing them. `Accepted`/`Rejected` are terminal. Enforced exclusively in `ApplicationStatusService.changeStatus`, re-checked server-side regardless of what the UI offers (`CODE_STYLE.md` "Never trust client input").
- **Every status change creates a history record** (`BUSINESS_RULES.md` "Status History"): `ApplicationStatusHistoryRepository.createTransition` inserts before returning success; the Phase 3 `sync_current_status` trigger then reflects it onto `applications.current_status` automatically - `ApplicationStatusService` never writes `current_status` directly (`ADR-017`).
- **Dates must never be inferred** (`BUSINESS_RULES.md` "Date Handling"): transitioning out of Wishlist without an `application_date` already set requires the user to supply one as part of that transition (enforced by `needsApplicationDateForTransition`, backed by `DATABASE.md`'s `applications_date_required_after_wishlist_check`) - never defaulted to "today" automatically.
- **Auditability**: successful transitions are logged (`console.info`).
- **Ownership**: `ApplicationStatusHistoryRepository.listByApplication` has no `user_id` column to filter by directly (the table doesn't have one); ownership is verified via `ApplicationRepository.findById` first, backed independently by RLS's `EXISTS` subquery on `applications.user_id`.

### Technical decisions

- **`APPLICATION_STATUS_TRANSITIONS` lives in `application.constants.ts`, not only inside the Service**: it's a plain lookup table (data), reused by both `ApplicationStatusService` (enforcement) and `ChangeApplicationStatusDialog` (so the "New status" `Select` only ever offers valid next statuses, rather than all nine with server-side rejection as the sole feedback). The Service remains the sole *enforcer* - the constant is shared data, not shared decision-making.
- **`needsApplicationDateForTransition` extracted as a named function**, not inlined separately in both the Service and the Dialog - found and fixed during self-review (see below); it was initially hand-duplicated as the same boolean expression in two places.
- **`ApplicationStatusHistoryRepository.createTransition` added as a new, separate method, not a generalization of `createGenesis`**: consistent with this codebase's existing repository style of narrow, purpose-named methods (e.g. `CompanyRepository.archive` is its own method, not a generic `update` variant) and with `IMPLEMENTATION_ORDER.md`'s "do not modify previous phases unless fixing a bug" - there was no bug in `createGenesis`.
- **`formatDateTime` requires client-side rendering**: `BUSINESS_RULES.md` mandates local-timezone display, which a Server Component cannot correctly know. `ApplicationStatusTimeline` is `"use client"` and uses `suppressHydrationWarning` on the formatted-time element - the standard, documented Next.js pattern for values that legitimately differ between the server's first-pass render and the client's corrected one.
- **Application Detail page reuses existing dialogs directly** (`ApplicationFormDialog`, `ConfirmDialog`) rather than introducing parallel edit/archive UI - only the two genuinely new pieces (status timeline, status-change dialog) are new components.
- **Salary displayed with a `!= null` check, not truthiness**, to correctly handle a `$0` minimum salary (an unusual but valid edge case given `salary_min` only requires non-negative, not positive).

### Self-review findings (fixed before closing the phase)

A fresh re-read of every file created/modified in this phase, done as if reviewing another engineer's PR, found one real issue:

- **Duplicated business condition**: `current_status === "Wishlist" && !application_date` was independently written twice - once in `ApplicationStatusService.changeStatus` (to decide whether to reject the transition) and once in `ChangeApplicationStatusDialog` (to decide whether to show the date field). Extracted to `needsApplicationDateForTransition` in `application.constants.ts`, used by both. This is the same class of fix as Phase 8's own self-review catch (a hand-duplicated condition/helper rather than one shared definition), now applied to a genuine business rule rather than an infrastructure detail.

No other issues found on re-read: architecture scan (no `@/features` in `shared/`, no Supabase outside `repositories/`, no repository-to-repository calls, no Service bypassing its Repository) came back clean.

### Deviations from the documentation

- **`offer_salary`, `rejection_reason`, `response_date` remain unset by any Service** (Phase 8 already excluded them from the create/edit form as "Phase 9 concerns"; Phase 9's own task list - "Status transitions. Status history. Validation. Timeline." - doesn't mention populating them either, and no document requires it: neither `ANALYTICS_ENGINE.md`'s formulas nor `BUSINESS_RULES.md` reference `offer_salary`/`rejection_reason`, and `response_date` appears redundant with what `application_status_history` already derives). Left as a documented gap rather than speculatively adding capture UI nobody asked for - see `KNOWN_ISSUES.md`.
- **No Kanban/pipeline board**: `VALUE_PROPOSITION.md`/`VISION.md` mention "the Kanban board" in passing (Free Plan description, MVP definition), but no concrete UI spec exists anywhere for it - `UI_SYSTEM.md`'s "Applications Page" lists only Table/Filters/Search/Create/Pagination, and its "Application Detail" lists a Timeline, not a board. Built the documented, concrete spec (table + detail-page timeline); a Kanban view would be inventing undocumented UI behavior.
- **Non-atomic date-then-transition write**: setting `application_date` (when required) and inserting the transition history row are two separate statements, not one transaction (same constraint as Phase 8's genesis insert - no RPC/transaction mechanism exists). If the second write fails after the first succeeds, the date is saved but the status doesn't change; a retry succeeds cleanly since the date requirement is now already satisfied. Flagged in `KNOWN_ISSUES.md`.

### Verification

- Production build, TypeScript (via `next build`), ESLint, and Prettier all pass with zero errors. `/applications/[id]` is registered as a dynamic route.
- Architecture scan re-run after the self-review fix: still clean.
- **Not verified**: real Server Actions against live data (same root cause as every prior phase - no confirmed test account reachable from this environment), and specifically the full transition flow (date-setting + history insert + trigger sync) has only been verified by code review and by tracing the exact SQL constraint evaluation order, not by exercising it against a live database.

---

## Phase 10 — Notes (2026-07-18)

Create/Edit/Archive for notes attached to applications, per `IMPLEMENTATION_ORDER.md`. Completes the Application Detail page's documented section list (`UI_SYSTEM.md` "Application Detail": General Information, Current Status, Status History, Notes, Actions) - Notes was the last of the five deliberately deferred until this phase.

### Added

- `src/features/applications/repositories/application-note.repository.ts`, `.../services/application-note.service.ts`, `.../actions/application-note.actions.ts` - the Repository → Service → Server Action chain for notes, placed inside the `applications` feature (not a new top-level `notes/` feature - see "Technical decisions").
- `src/features/applications/components/{ApplicationNoteForm,ApplicationNoteFormDialog,ApplicationNoteCreateButton,ApplicationNotesList}.tsx`.
- `ApplicationNote` type (`application.types.ts`); `createApplicationNoteSchema` / `updateApplicationNoteSchema` / `archiveApplicationNoteSchema` (`application.schema.ts`), sharing one `noteContentField` definition.
- Application Detail page (`applications/[id]/page.tsx`): new "Notes" card (create button + list), completing the page's documented section set.

### Business rules implemented

- **"Notes belong to exactly one application"** (`BUSINESS_RULES.md`): every note operation resolves and verifies the parent application's ownership before touching `application_notes` - via `ApplicationService.getById`, not a second, parallel ownership check (see "Technical decisions").
- **"Markdown is supported. Rich text is not."**: content is a plain multi-line text field (`Textarea`), not a rich-text/WYSIWYG editor - satisfying "not rich text" without installing an unapproved dependency. Displayed with `whitespace-pre-wrap` to preserve authored line breaks; markdown syntax itself is stored and shown faithfully as typed, not stripped or rejected (no markdown-to-HTML renderer is installed - see "Deviations").
- **Soft delete only**: archiving sets `deleted_at`; `application_notes` has no DELETE grant or RLS policy at all (verified against the Phase 3 migration), matching every other business entity in this project.
- **Auditability**: successful archives are logged (`console.info`).
- **Ownership**: `application_notes` has no `user_id` column of its own; ownership is verified through `ApplicationService.getById` (which itself enforces the applications table's RLS-backed ownership), with RLS's own `EXISTS` subquery against `applications.user_id` as the independent, ultimate enforcement.

### Technical decisions

- **Physically nested inside `src/features/applications/`, not a new `notes/` feature folder**: `BUSINESS_RULES.md` is explicit that notes have no independent existence ("belong to exactly one application"), no list-view or page of their own anywhere in `UI_SYSTEM.md`/`API.md` - mirroring the same reasoning that placed Status Tracking inside `applications/` in Phase 9.
- **`ApplicationNoteService` calls `ApplicationService.getById`, not `ApplicationRepository.findById` directly - a deliberate refinement from Phase 9's precedent, explained before implementing**: Phase 9's `ApplicationStatusService` reaches into `ApplicationRepository` directly, treating Status Tracking as a sibling sub-concern of the same table. This phase's instructions are explicit and repeated ("reuse existing Services instead of duplicating business logic," "ownership validation... must not be duplicated," "those features remain the single source of truth for their respective business rules") in a way Phase 8/9 didn't spell out as emphatically. Read together, Notes is coordinating *with* an already-complete feature (Applications) rather than extending it from the inside, so it goes through that feature's public Service interface. Phase 9's code was not changed to match (no bug to justify touching it) - the two sibling services now intentionally differ in this one respect, documented here rather than left as a silent inconsistency.
- **No `DataTable` for the notes list**: notes are variable-height freeform text blocks, not tabular rows, and `FEATURES.md`'s "Unlimited notes" carries no documented pagination requirement - forcing them into `DataTable`'s column/page model would be a worse fit than a plain list. `EmptyState` and `ConfirmDialog` are still reused directly.
- **Newest-first ordering** (`created_at` descending): not specified by any document (unlike Status History, which `API.md` explicitly orders ascending) - a reasonable default for a notes feed, where the most recent thought is usually what a returning user wants to see first.
- **`formatDateTime` (introduced in Phase 9) is reused as-is** for each note's timestamp, with the same `"use client"` + `suppressHydrationWarning` treatment as `ApplicationStatusTimeline` - no second date-formatting implementation.
- **Notes are not wired into the Applications list's search** (`BUSINESS_RULES.md`'s "Search" section lists Notes as a field): `IMPLEMENTATION_ORDER.md` assigns "Search notes" explicitly to **Phase 13** ("Search applications. Search companies. Search notes."), not Phase 10 - a stronger, more direct confirmation than the similar CV-search scope decision in Phase 7, since this one is explicit in the phase ordering itself rather than inferred from an omission.

### Self-review findings (fixed before closing the phase)

A fresh re-read of every file created/modified in this phase, plus a codebase-wide duplication sweep, found one real issue:

- **Duplicated ownership-check block**: `ApplicationNoteService.update` and `.archive` each independently repeated the same four-statement sequence (fetch the note by id, fail with "Note not found" if missing, verify the parent application via `ApplicationService.getById`, fail with the same message if not owned). Extracted into a private `findOwnedNote` helper used by both.

No other issues found: the codebase-wide sweep confirmed no parallel Notes implementation exists anywhere else, `noteContentField` is defined once and used by both create/update schemas, and the architecture scan (no `@/features` in `shared/`, no Supabase outside `repositories/`, no repository-to-repository calls, no Service bypassing its Repository) came back clean.

### Deviations from the documentation

- **No markdown-to-HTML rendering**: no markdown-rendering library is installed or approved (`IMPLEMENTATION_RULES.md` requires approval before adding a dependency). Interpreted "Markdown is supported. Rich text is not." as describing the *input mechanism* (plain text, not a WYSIWYG rich-text editor) rather than mandating rendered HTML output - content is stored and displayed faithfully as authored text. If actual markdown rendering is wanted, it requires a dependency-approval conversation first; flagged in `KNOWN_ISSUES.md`.

### Verification

- Production build, TypeScript (via `next build`), ESLint, and Prettier all pass with zero errors after the self-review fix.
- Confirmed via `git diff --stat` that no migration file was modified and no new migration was added (no schema change was needed - the `application_notes` table and its RLS policies/grants already existed from Phase 3).
- **Not verified**: real Server Actions against live data - same root cause as every prior phase (no confirmed test account reachable from this environment).

---

## Phase 11 — Dashboard (2026-07-18)

KPI cards, Recent Applications, Quick Actions, and dashboard layout, per `IMPLEMENTATION_ORDER.md`. Replaces the Phase 5 placeholder (`"Logged in as {email}"`) with real, aggregated data. The Dashboard is implemented as a pure aggregation layer, per this session's explicit instruction: it introduces no new business rules of its own, only combining existing Services' results.

### Added

- `ApplicationRepository.countByStatuses(userId, statuses?)` - one generic, mechanical count primitive (optional status filter; omitted/empty means unfiltered total).
- `INTERVIEW_STAGE_STATUSES`, `OFFER_STAGE_STATUSES` in `application.constants.ts` - the exact stage groupings `ANALYTICS_ENGINE.md`'s KPI formulas are defined against.
- `src/features/applications/services/application-stats.service.ts` - `ApplicationStatsService.getDashboardCounts`, a new sibling to `ApplicationService`/`ApplicationStatusService`/`ApplicationNoteService` (same file-per-sub-concern pattern from Phases 9-10). Deliberately placed inside the `applications` feature, not the new `dashboard` feature - "what counts as Active/Interviews/Offers" is an Applications-domain business rule (and one Phase 12's Analytics will very likely need too), not a Dashboard-specific one.
- `src/features/dashboard/services/dashboard.service.ts` - `DashboardService.getSummary`, the actual aggregation layer: combines `ApplicationStatsService` (counts) and `ApplicationService.list` (recent applications) into one view-model. Introduces no new counting/sorting logic of its own.
- `src/features/dashboard/components/{DashboardKpiCards,RecentApplicationsTable,QuickActions}.tsx`.
- `src/app/(dashboard)/dashboard/page.tsx` replaced (was the Phase 5 placeholder).

### Business rules implemented

- **Dashboard KPIs** (`ANALYTICS_ENGINE.md` "Dashboard KPIs", exact formulas): Total Applications, Active Applications (derived: `total - acceptedOffers - rejected`, exact since Accepted/Rejected are mutually exclusive with every other status - not an estimate), Interviews (`current_status` in HR/Technical/Final Interview, Offer, or Accepted), Offers (`current_status` in Offer or Accepted), Accepted Offers, Rejected Applications.
- **"Dashboard data must always be real-time"** (`BUSINESS_RULES.md` "Dashboard Rules"): every number is computed fresh per request via SQL `COUNT`, no caching, no scheduled jobs - satisfied automatically by not introducing any.
- **Recent Applications**: reuses `ApplicationService.list` exactly as the Applications list page already calls it (`sort_by: "updated_at", sort_dir: "desc"`), just with a smaller `limit` - zero new sorting/filtering logic.
- **Quick Actions**: reuses `ApplicationCreateButton`/`CompanyCreateButton`/`CVVersionCreateButton` verbatim - zero new creation logic or dialogs.

### Technical decisions

- **KPI-bucket counting stays a generic repository primitive + a Service-level business decision, not baked into one query**: `ApplicationRepository.countByStatuses` has no idea what "Active" or "Interviews" means; `ApplicationStatsService` supplies the status lists. Mirrors the same repository/Service split already used for the transition graph (Phase 9).
- **5 parallel `COUNT` queries, not 6**: "Active" is derived by subtraction from Total/Accepted/Rejected (already being fetched for their own cards) instead of issuing a 6th query - a direct application of "prefer aggregated queries... avoid unnecessary database queries" without inventing a SQL view or RPC function (`DATABASE.md` reserves those for "future versions").
- **No `DataTable`-avoidance this time**: unlike Notes (freeform text, not tabular), Recent Applications' data (Position/Company/Status/Updated At) is genuinely columnar, so `RecentApplicationsTable` reuses the shared `DataTable` directly - with no Edit/Archive actions (a read-only glance view; those already exist on the full list/detail pages) and therefore no need to fetch Company/CV Version option lists just for this widget.
- **`formatDateTime` (Phase 9) reused as-is** for the "Last Updated" column, with the same `"use client"` + `suppressHydrationWarning` treatment already established.
- **Charts and Insights deferred to Phase 12**: `UI_SYSTEM.md`'s fuller "Dashboard Page" component list (KPI Cards, Charts, Recent Applications, Insights, Quick Actions) includes two sections IMPLEMENTATION_ORDER.md's Phase 11 task list omits. "Insights" is explicitly a Phase 12 task by name; "Charts" corresponds to metrics (Applications per Month, Response Rate, Sources, Funnel) that are themselves Phase 12 Analytics deliverables - implementing either now would mean starting Phase 12 work, which this session's instructions explicitly forbid.

### Deviations from the documentation

- **`FEATURES.md` Feature 7's "Current Success Rate" KPI was not implemented as named** - reconciled against `ANALYTICS_ENGINE.md`'s "Dashboard KPIs", which lists "Accepted Offers" in that slot instead, with an exact, unambiguous formula (`COUNT(current_status = 'Accepted')`). No document anywhere defines what "Current Success Rate" divides by, and `ANALYTICS_ENGINE.md`'s own Claude Instructions are explicit: "Never invent metrics... every metric must be reproducible using SQL." Implementing an undefined ratio would require inventing one. The other 4 of FEATURES.md's 6 KPIs (Total, Active, Interviews, Offers) and "Rejected"/"Rejected Applications" (same metric, different wording) match exactly between both documents.

### Self-review findings

A fresh re-read of every file created/modified in this phase, plus a codebase-wide duplication sweep, found no new issue introduced by this phase's own code. It did surface that a pattern already flagged as a Minor, 2-instance finding during the Phase 9 audit (never written into `KNOWN_ISSUES.md` at the time, only reported in that audit's response) has now become a real, 3-instance duplication:

- **`OPTION_LIST_LIMIT = 100` + "map Company/CV Version list results to `{id, name}[]`, defaulting to `[]` on failure"** is now written identically in `applications/page.tsx` (Phase 8), `applications/[id]/page.tsx` (Phase 9), and this phase's `dashboard/page.tsx`. Per this project's own standing rule ("abstractions should emerge only after multiple real use cases demonstrate they are necessary"), 3 real occurrences crosses that threshold. **Not fixed in this phase**: doing so would mean modifying two previous phases' files with no bug to justify it (`IMPLEMENTATION_ORDER.md` "Do not modify previous phases unless fixing a bug"). Recorded in `KNOWN_ISSUES.md` as a concrete, actionable follow-up (a small helper, e.g. resolving both option lists in one call, reused by all three pages) rather than performed as an unrequested refactor.

### Verification

- Production build, TypeScript (via `next build`), ESLint, and Prettier all pass with zero errors.
- Architecture scan: no `@/features` imports inside `shared/`; no Supabase access outside `repositories/`; no repository imports another repository; no Service uses `createClient` directly; `DashboardService`/dashboard components never call any Repository directly - only Services. No `any` introduced.
- Query count: one dashboard page load issues 8 total queries (5 parallel KPI counts + 1 recent-applications list + 1 companies list + 1 CV versions list), across 2 levels of `Promise.all` - no N+1 pattern (all fixed-count regardless of data volume).
- **Not verified**: real data against a live database (same root cause as every prior phase - no confirmed test account reachable from this environment).

---

## Phase 12 — Analytics (2026-07-19)

Response Rate, Interview Rate, Offer Rate, Monthly/Company/CV/Source Analytics, Funnel Analytics, and Insights, per `IMPLEMENTATION_ORDER.md`. Analytics is implemented as a pure aggregation layer over the existing domain (`ApplicationService`, `ApplicationStatusService`, `ApplicationStatsService`) - it introduces no new database access pattern beyond two bulk reads, and duplicates none of those Services' existing KPI logic.

### Added

- `ApplicationRepository.listAllForAnalytics` / `ApplicationService.listAllForAnalytics` - a bulk, unpaginated read (lean column set) distinct from `list`'s page-at-a-time contract; analytics must see the whole dataset to aggregate correctly.
- `ApplicationStatusHistoryRepository.listByApplicationIds` / `ApplicationStatusService.listHistoryForApplications` - bulk sibling of the existing single-application history read.
- `ApplicationStatsService.getDashboardCounts` extended with a `responded` count (Response Rate's numerator) - additive, no existing consumer (Dashboard) affected.
- `UNRESPONDED_STATUSES` constant (`application.constants.ts`) - extracted so the "not yet responded" status set is defined once, not as a repeated inline literal.
- `AnalyticsApplicationRow` type (`application.types.ts`) - the lean shape the bulk analytics read selects.
- `src/features/analytics/` (new feature): `constants/analytics.constants.ts` (funnel stages, documented minimum sample sizes), `types/analytics.types.ts`, `utils/analytics-calculations.ts` (pure calculation functions - grouping, rates, funnel, insights), `services/analytics.service.ts` (`AnalyticsService.getSummary` - orchestration only), `components/{AnalyticsRateCards,AnalyticsComparisonTable,FunnelChart,InsightsList}.tsx`.
- `src/app/(dashboard)/analytics/page.tsx` - previously a placeholder-free route (nav link existed since Phase 5, no page file).

### Metrics implemented

- **Response Rate** (`ApplicationStatsService.responded / total`), **Interview Rate**, **Offer Rate** (both reusing the *exact same* `interviews`/`offers` counts `ApplicationStatsService` already computes for the Dashboard - not recalculated here, per this phase's explicit "do NOT compute the same metric twice" instruction).
- **Company / CV Version / Source Analytics**: Applications, Responses, Interviews, Offers, Accepted, Rejected, Response/Interview/Offer Rate, Average Response Time - one generic `computeGroupAnalytics` aggregator reused for all three (and Monthly), per `ANALYTICS_ENGINE.md` defining an identical column set for each. CV Analytics sorted by Interview Rate descending, per that section's explicit instruction.
- **Monthly Analytics**: the same grouped-row shape, keyed by `application_date`'s year-month.
- **Average Response Time**: `application_date -> first transition out of Applied`, derived from bulk status history (the transition OUT of Applied is, by construction, the first response - Applied has exactly one outgoing edge per application).
- **Funnel Analytics**: for each of the 7 stages (Applied through Accepted), applications entering/progressing/rejected-from and conversion/drop-off rates - computed from each application's full status history (not `current_status` alone, since a since-rejected application must still count as having "entered" every stage it actually passed through).
- **Insights**: deterministic sentences only, each gated by `ANALYTICS_ENGINE.md`'s documented minimum sample sizes - folds in "Best Performing CV" (full Interview Rate -> Offer Rate -> Acceptance Rate tie-break, minimum 10 applications), "Best Application Source" (highest interview rate, minimum 5), "Best Company" (highest response rate, minimum 3), and the funnel's highest-drop-off stage.

### Business rules implemented

- **"Every metric must be reproducible using SQL... never invent metrics"** (`ANALYTICS_ENGINE.md`): every formula implemented matches a section of that document exactly; anything without a documented formula was left out (see "Deviations").
- **"Analytics are not stored... calculated when requested"**: no caching, no scheduled job - every page load recomputes from current data.
- **"Empty State Behaviour": "Do not estimate. Display: 'Not enough historical data.'"**: `AnalyticsService` decides `meetsMinimum` against the documented thresholds; components only render that decision, never invent their own.
- **Ownership**: unchanged from the underlying Services - `listAllForAnalytics`/`listHistoryForApplications` operate only on data already scoped to the authenticated user by `ApplicationService`/`ApplicationStatusService`.

### Technical decisions

- **Two bulk reads + in-memory aggregation, not per-group queries or a new SQL view**: PostgREST's REST interface has no `GROUP BY` primitive; the only ways to get grouped aggregates are per-category queries (which would mean issuing a query per CV/company/source - genuine, data-size-dependent repetition, exactly what "avoid N+1... prefer a small number of efficient queries" warns against) or a bulk fetch aggregated in application code. `DATABASE.md` explicitly defers SQL views (`cv_statistics`, `company_statistics`, `monthly_statistics`) to "future versions," so introducing one now was not an option. Chose two bulk, lean-column reads (applications, status history) aggregated once in `analytics-calculations.ts` - a single explained exception to "prefer SQL aggregation," not a pattern applied loosely elsewhere.
- **`AnalyticsService` calls `ApplicationService`/`ApplicationStatusService`/`ApplicationStatsService` - never a Repository directly**: consistent with the Notes (Phase 10) precedent of going through an existing feature's Service, not around it, since Analytics is coordinating with already-complete, independent domain Services rather than extending them from the inside.
- **`analytics.service.ts` split into orchestration (`services/`) + pure calculation (`utils/analytics-calculations.ts`)** - found during self-review: the single-file version was 407 lines, well over `CODE_STYLE.md`'s 300-line target. The split cleanly separates "fetch and delegate" from "compute," with zero behavior change.
- **`AnalyticsComparisonTable` reused for Company, CV, Source, *and* Monthly Analytics** (one component, four call sites) - justified by `ANALYTICS_ENGINE.md` defining an identical row shape for all four, not introduced speculatively. Uses the shared `DataTable`'s client-side sort correctly here (unlike `ApplicationsTable`, which avoids it): every row for these sections is already loaded in one bulk, unpaginated read, so sorting the full in-memory set is correct, not a partial-page illusion.
- **Funnel visualized as CSS-width bars, not a charting library**: no chart dependency is installed, and `IMPLEMENTATION_RULES.md` requires approval before adding one. A dependency-free bar visualization satisfies "Charts visualize existing metrics" without that conversation.
- **Applications with no recorded `source` are excluded from Source Analytics**, not grouped under an invented "Unknown" bucket - `DATABASE.md`'s `application_source` enum has no such value.

### Deviations from the documentation

- **Not implemented (no document names them as a Phase 12 deliverable, and no later phase claims them either)**: Acceptance Rate as its own top-level metric (used only internally for the CV insight's tie-break), standalone Average Offer Time / Average Hiring Time, Work Mode Analytics, Employment Type Analytics, and Trend Analysis (month-over-month growth percentages). `IMPLEMENTATION_ORDER.md`'s Phase 12 task list names exactly 9 deliverables (Response/Interview/Offer Rate, Monthly/Company/CV/Source Analytics, Funnel, Insights); these items appear in `ANALYTICS_ENGINE.md`/`FEATURES.md` but outside that list, so implementing them would mean starting undocumented scope. Flagged in `KNOWN_ISSUES.md` as a genuine, real documentation gap - the same treatment given to Phase 8's "Duplicate application" gap.
- **"Best Performing CV/Application Source/Company" folded into Insights, not built as a separate ranked-badge feature**: `FEATURES.md` names "Most Successful CV/Source/Company" and `ANALYTICS_ENGINE.md` gives them their own sections with a specific tie-break algorithm, but `IMPLEMENTATION_ORDER.md`'s Phase 12 task list names only "Insights" - the full, documented tie-break logic was implemented and used to generate insight sentences, satisfying both documents without adding a separate UI section nowhere named in the phase's task list.

### Self-review findings

A fresh re-read of every file created/modified in this phase, plus a codebase-wide duplication sweep, found one real issue:

- **`analytics.service.ts` exceeded the 300-line file-size target** (407 lines: orchestration and nine pure calculation functions in one file). Fixed by extracting every pure function (no I/O) into `utils/analytics-calculations.ts`, leaving `analytics.service.ts` at 101 lines of pure fetch-and-delegate orchestration. Re-verified clean afterward (build/TypeScript/ESLint/Prettier all still pass).

No other issues found: the duplication sweep confirmed no KPI is computed twice (Interview Rate/Offer Rate reuse `ApplicationStatsService`'s exact counts; `UNRESPONDED_STATUSES`/`INTERVIEW_STAGE_STATUSES`/`OFFER_STAGE_STATUSES` are each defined once and reused by both `ApplicationStatsService` and the new analytics calculations); the architecture scan (no `@/features` in `shared/`, no Supabase outside `repositories/`, no repository-to-repository calls, no Service bypassing its Repository, `AnalyticsService` never calls a Repository directly) came back clean.

### Verification

- Production build, TypeScript (via `next build`), ESLint, and Prettier all pass with zero errors.
- Query count per Analytics page load: 3 (applications bulk fetch + dashboard-style counts, in parallel, then status history bulk fetch) - all fixed-count relative to the number of distinct entities/months, not per-category queries; everything downstream is in-memory aggregation over that bounded data.
- **Not verified**: real data against a live database (same root cause as every prior phase - no confirmed test account reachable from this environment); the funnel/response-time calculations were verified by tracing the logic against `ANALYTICS_ENGINE.md`'s definitions and the Phase 3 transition-graph constraints, not by exercising them against real historical data.

---

## Phase 13 — Search (2026-07-19)

Global search across Companies, Applications, and Notes, per `IMPLEMENTATION_ORDER.md` and `API.md`'s `GET /search`. Implemented as a pure aggregation layer, reusing `CompanyService.list`/`ApplicationService.list` verbatim and adding exactly one new capability - notes had no cross-application search path before this phase.

### Added

- `src/features/search/` (new feature): `constants/search.constants.ts` (`SEARCH_RESULT_LIMIT`), `types/search.types.ts`, `schemas/search.schema.ts`, `services/search.service.ts` (`SearchService.search` - orchestration only, short-circuits an empty query before issuing any Service call), `actions/search.actions.ts` (`searchAction`), `components/GlobalSearch.tsx` (header dropdown, debounced).
- `ApplicationNoteRepository.searchByContent` / `ApplicationNoteService.search` - the one genuinely new query this phase required (notes have no `user_id` of their own; ownership enforced via an `!inner` join to `applications`, mirroring `ApplicationRepository.listAllForAnalytics`'s existing join pattern).
- `NoteSearchRow` type (`application.types.ts`).
- `TopNav.tsx`'s Phase 5 placeholder search input wired up to `GlobalSearch`.

### Technical decisions

- **Hand-rolled results dropdown, not the installed `Combobox` primitive** - `combobox.tsx` exists in `shared/ui` but was unused anywhere in the app, with no working example of async/grouped-result wiring; a plain conditional panel avoided the risk of misusing an unverified API surface, per "avoid unnecessary dependencies."
- **Server Action + client debounce, not a URL param** - unlike every other page-level search box, Global Search spans three different destination pages at once from a header mounted everywhere, so there is no single page's `?query=` to update.

### Deviations

- No dedicated Search results page - `UI_SYSTEM.md` documents "Search" only under "Top Navigation," with no "Search Page" section the way Dashboard/Analytics/Applications/Companies each get one.

---

## Phase 14 — Export (2026-07-19)

CSV and JSON export of user data, per `IMPLEMENTATION_ORDER.md`, `FEATURES.md` Feature 12, and `API.md`'s `GET /export/csv` / `GET /export/json`.

### Added

- `src/features/export/` (new feature): `constants/export.constants.ts` (`EXPORT_ALL_LIMIT`), `utils/export-csv.ts` (`buildApplicationsCsv` - pure, RFC 4180 escaping), `services/export.service.ts` (`ExportService.exportCSV` / `exportJSON`), `actions/export.actions.ts`, `components/ExportMenu.tsx` (header dropdown, client-side Blob download).
- `ApplicationNoteRepository.listAllForUser` / `ApplicationNoteService.listAllForUser` - the one new bulk-read capability this phase required.
- `NoteExportRow` type.

### Technical decisions

- **CSV covers Applications only** (denormalized with Company/CV Version names); **JSON covers the full account bundle** (companies, CV versions, applications, notes) - CSV is inherently a single flat table and cannot natively hold four differently-shaped entities without a zip/multi-file mechanism (a new dependency this phase's instructions caution against). Applications was chosen as the entity every other record exists to describe.
- **Reused `.list()` with a large limit instead of new bulk-fetch methods** for Companies/CV Versions/Applications - unlike Analytics (Phase 12), Export needs the *full* row, which `.list()` already returns; only Notes needed a genuinely new method.
- **Server Action + client-side Blob download, not a Route Handler** - this app has no Route Handlers anywhere; every `API.md` "GET" endpoint is already translated into a Server Action/Component elsewhere, so Export follows the same precedent.

### Deviations

- CSV does not literally include standalone Companies/CV Versions/Notes with no associated application, a direct consequence of the CSV-scope decision above. A later architectural review (see Phase 14 review, undated in this file) found this - together with archived-record exclusion from every export path - a genuine gap against `API.md`'s identically-worded "Exports all user data" for both formats; **not yet remediated** (see `KNOWN_ISSUES.md`).

---

## Phase 15 — Settings (2026-07-19)

Profile, Theme, and Account settings, per `IMPLEMENTATION_ORDER.md`'s "Profile. Theme. Account." `public.users` had existed since Phase 3 (with a working `auth.users -> public.users` sync trigger and RLS policies) but had never been queried by any application code before this phase.

### Added

- `src/features/users/` (new feature, mirroring the Companies/CV Versions shape): `types/user.types.ts`, `schemas/user.schema.ts` (`updateProfileSchema`), `repositories/user.repository.ts`, `services/user.service.ts` (`getProfile` / `updateProfile`), `actions/user.actions.ts`.
- `src/features/settings/components/ProfileForm.tsx`, `ChangePasswordForm.tsx`.
- `src/app/(dashboard)/settings/page.tsx` - composes `UserService`, the existing `ThemeToggle`, and the new `ChangePasswordForm`.
- `changePasswordAction` (`auth.actions.ts`) - reuses `updatePasswordSchema` and `AuthService.updatePassword` verbatim; new only in requiring an existing session (not a recovery session) and not redirecting to `/login` afterward.

### Deviations

- **"Danger Zone" (account deletion) was not implemented.** Named in `FEATURES.md`/`UI_SYSTEM.md` but absent from `IMPLEMENTATION_ORDER.md`'s Phase 15 task list - the same precedent as Phase 11 deferring Charts/Insights. It would also require a Supabase Admin API / service-role client, which does not exist anywhere in this codebase (see `DEPLOYMENT.md`'s `SUPABASE_SERVICE_ROLE_KEY` note).
- Avatar upload and email editing were not implemented - both explicitly out of documented scope (`FEATURES.md`: "Future versions may support avatars"; email changes require a separate Auth confirmation flow not named in any phase).

---

## Phase 16 — Optimisation (2026-07-19)

Query optimisation, component optimisation, duplicated-code removal, and loading states, per `IMPLEMENTATION_ORDER.md`. No behaviour changed; every optimization was justified by an explicit, pre-identified issue.

### Added

- `ApplicationPickerService` (`application-picker.service.ts`) - extracted exactly per `KNOWN_ISSUES.md`'s Phase 11 "recommended fix," eliminating the Company/CV Version picker-options logic that had been copy-pasted across `applications/page.tsx`, `applications/[id]/page.tsx`, and `dashboard/page.tsx`.
- `PaginationControls` (`shared/components/`) - eliminated the identical "Page X of Y / Previous / Next" footer copy-pasted across Applications, Companies, and CV Versions.
- `PageSkeleton` (`shared/components/`) and a `loading.tsx` for every dashboard route (Dashboard, Applications, Application Detail, Companies, CV Versions, Analytics, Settings) - previously none existed anywhere, so every navigation showed nothing while its Server Component's data resolved.

### Modified

- `applications/page.tsx`, `applications/[id]/page.tsx`, `dashboard/page.tsx`, `companies/page.tsx`, `cv-versions/page.tsx` - adopted the two extractions above.

### Deviations (considered and rejected)

- Extracting the repeated "auth check + Zod parse + call Service" boilerplate present in every Server Action - real duplication, but abstracting it would touch every action file for a stylistic gain and risks a decorator/HOF pattern this phase's "do not redesign the architecture" instruction cautions against.
- Extracting the identical full-name Zod validation shared by `registerSchema` and `updateProfileSchema` - not enough real use cases (two) to justify a new cross-feature shared schema.
- Wiring up `DataTable`'s unused `isLoading` prop - would require restructuring pages into client-side fetching, a genuine behaviour change; `loading.tsx` addresses the same need without touching how any table gets its data.

---

## Phase 17 — Testing (2026-07-19)

Unit and integration tests, per `IMPLEMENTATION_ORDER.md`. Introduces Vitest - this project's first test framework and its first new runtime dependency category since Phase 1.

### Added

- `vitest.config.ts` (Node environment, `@/*` alias matching `tsconfig.json`, `clearMocks: true`).
- 88 tests across 10 files: pure-function unit tests (`analytics-calculations.test.ts`, `export-csv.test.ts`, `application.constants.test.ts`), Zod validation tests (`company.schema.test.ts`, `application.schema.test.ts`), and Service-layer integration tests with Repositories mocked at the module boundary (`company.service.test.ts`, `application-status.service.test.ts`, `auth.service.test.ts`, `search.service.test.ts`, `user.service.test.ts`).
- `npm run test` script.

### Deviations

- **End-to-end tests were not implemented.** No confirmed, email-verified Supabase test account has been reachable from this environment at any point since Phase 4 (documented repeatedly throughout this file and `KNOWN_ISSUES.md`), and this phase's explicit "all tests must pass" / "deterministic" requirements made installing a framework that could not be reliably executed here a worse outcome than not installing it. Recommended for a future phase once a real, reachable test environment exists.
- Repositories are not directly tested (thin Supabase query builders with no branching logic; their correctness is exercised indirectly through the Service-layer integration tests, which is where their calling contracts are actually asserted).
- CV Versions' Service was not separately tested - it mirrors `CompanyService` exactly, and duplicating that test file would add no real coverage.

---

## Phase 18 — Production Ready (2026-07-19)

Final review, accessibility/responsive/security/documentation review, and deployment configuration, per `IMPLEMENTATION_ORDER.md`. No product features, business rules, or architecture changed.

### Added

- `.github/workflows/ci.yml` - Type Check, Lint, Build, Unit Tests on every push/PR to `main`, per `DEPLOYMENT.md`'s "Continuous Integration" section (previously undocumented as code, despite being fully specified).
- `npm run typecheck` script (`tsc --noEmit`), used as CI's explicit Type Check step rather than relying only on the type-check embedded inside `next build`.

### Documentation corrected

- `DEPLOYMENT.md`: `SUPABASE_SERVICE_ROLE_KEY` moved out of "required" environment variables - confirmed via a full-codebase grep that no code path uses the Supabase Admin API or a service-role client anywhere in this project; it would only become required if a future version implements a feature needing elevated privileges (e.g. Phase 15's deferred account deletion).
- `README.md`: added the `typecheck`/`test` commands and a "Continuous Integration" section documenting the new workflow and its required repository secrets.
- `CHANGELOG.md`: backfilled entries for Phases 13-18, which had no changelog record despite being fully implemented.

### Security review

No genuine issue found. Every dashboard page independently guards itself (`AuthService.getCurrentUser()` + `redirect(ROUTES.LOGIN)`), on top of the `(dashboard)/layout.tsx` guard and RLS as the actual, unbypassable enforcement layer. No secret is ever logged (`console.*` calls across the codebase log only user/entity UUIDs and audit messages, never credentials or tokens). `SUPABASE_SERVICE_ROLE_KEY` is not referenced anywhere in application code, so there is no risk of it reaching a client bundle. `.env.local` was never committed; `.env.example` contains no real values.

### Final review findings

No dead code, no duplicated business rules, and no unfinished implementations were found beyond what was already disclosed in `KNOWN_ISSUES.md` from prior phases. `DataTable`'s unused `isLoading` prop (Phase 16) and `next.config.ts`'s empty scaffold body were reviewed and left as-is - neither is a defect.

---

## Post-MVP Technical Debt Resolution (2026-07-19)

Resolved the documented technical debt named in `KNOWN_ISSUES.md`, in priority order: Export completeness, then a review of remaining items. No new functionality, business rule, or architectural pattern was introduced.

### Export completeness (Phase 14 debt, all three items resolved)

- **`application_status_history` added to JSON export.** `ExportService.exportJSON` now includes a `statusHistory` field, reusing `ApplicationStatusService.listHistoryForApplications` exactly as `AnalyticsService` already does - no new repository method needed.
- **Archived records included in every export path.** Added `listAllIncludingArchived` to `CompanyRepository`/`CompanyService`, `CVVersionRepository`/`CVVersionService`, and `ApplicationRepository`/`ApplicationService` - narrow siblings to each entity's existing `list`, used only by `ExportService`, so every other caller (list pages, pickers, Search, Dashboard) keeps its correct active-only behaviour unchanged. `ApplicationNoteRepository.listAllForUser` was modified in place (its only caller was already `ExportService`) to drop its `deleted_at` filters. Both `exportCSV` and `exportJSON` now use these reads; `EXPORT_ALL_LIMIT`/`export.constants.ts` were removed as dead code once the new methods made them unnecessary.
- **CSV scope vs. documented behaviour reconciled.** Rather than expanding CSV's mechanism to literally cover every entity (which would require a new zip/multi-file dependency - new functionality outside this resolution's scope), `API.md`, `BUSINESS_RULES.md`, and `FEATURES.md` were corrected to describe CSV's actual, sensible scope: a single flat table of Applications (including archived), denormalized with Company/CV Version names. JSON remains the format that satisfies "every user-owned entity" literally.

### End-to-end testing

Not implemented - no runnable environment exists. Same root cause as every prior phase: no confirmed, email-verified Supabase test account has been reachable from this environment at any point in this project's history, and this sandboxed tool environment's ability to run a headless browser against a live server remains unverified. Documented precisely in `KNOWN_ISSUES.md` "Phase 17" and "Phase 18" rather than attempted with an unreliable setup.

### Remaining technical debt addressed

- **Archived Company/CV Version picker gap (Phase 8 debt) resolved.** `ApplicationForm`'s `application` prop was widened from `Application` to `ApplicationWithRelations` (both existing callers already had this type available), and the form now merges the application's own current company/CV version into the picker options when it isn't already present in the active-only list passed down. Server-side validation (`ApplicationService.validateReferences`) already independently rejected any archived reference on submit - this changes only what is visible in the Select, not what is allowed.

### Added

- `src/features/export/services/export.service.test.ts` - covers the archived-inclusive reads and the new `statusHistory` field.

### Not addressed (remaining, environment-blocked)

Every other open item in `KNOWN_ISSUES.md` reduces to the same root cause already documented per-phase since Phase 4: no confirmed, reachable Supabase test account exists in this environment. This includes live-data verification for every phase's Server Actions/RLS policies, whether the two pending case-insensitive-name migrations have been applied, and whether the composite-FK embedded-resource query behaves as expected against a real project. None of these are fixable by further code changes; they require a real account and are the first things to verify once one is available.

---

# Version 2

Continues the phase numbering established by `IMPLEMENTATION_ORDER.md`, per `IMPLEMENTATION_ORDER_V2.md`.

---

## Phase 19 — V2 Readiness (Pre-Flight Cleanup) (2026-07-20)

Closed pre-existing MVP technical debt and confirmed a stable baseline before starting Version 2 feature work, per `IMPLEMENTATION_ORDER_V2.md`. No product features, business rules, or database changes.

### Fixed

- **`TopNav` no longer imports `@/features/export` or `@/features/search` directly.** This was a real `ARCHITECTURE.md` violation (`shared/` must remain feature-agnostic) discovered during a prior read-only audit but never previously corrected. `TopNav` now accepts `search` and `exportMenu` as `ReactNode` props, the same prop-injection pattern already used for `footer`/`userMenu`. `MainLayout` threads both new props through unchanged otherwise. `(dashboard)/layout.tsx` - the one place already legitimately depending on both `auth` and now `export`/`search` - supplies `<GlobalSearch />` and `<ExportMenu />` directly.

### Verified

- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` (93 tests, 11 files) all pass. The `vitest`-missing-from-`node_modules` build failure noted in a prior audit is no longer reproducing (a `npm install` outside this session appears to have resolved it - no code change was required).
- Connecting the GitHub repository to Vercel (`KNOWN_ISSUES.md`, Phase 18) remains a manual, dashboard-side step outside this environment's capability - not performed here, unchanged from its prior status.

### Notes

- `KNOWN_ISSUES.md` has no corresponding entry to remove for the `TopNav` fix: the violation was reported in a prior conversation's read-only audit response but was never written into the document (that audit was explicitly instructed not to modify any file). No `KNOWN_ISSUES.md` change was needed as a result.

---

## Phase 20 — Atomic Writes Foundation (Postgres RPC) (2026-07-20)

Introduced the project's first Postgres RPC function pattern, applied narrowly to the two non-atomic write sequences documented since the MVP, per `IMPLEMENTATION_ORDER_V2.md`. No new feature, business rule, or table/column change.

### Added

- `supabase/migrations/20260720090000_atomic_application_writes.sql` - two functions, `create_application_with_genesis` and `transition_application_status`. Each wraps writes that were previously two sequential statements into one transaction. Neither validates anything or contains a business rule; both run `SECURITY INVOKER` (the default), so RLS continues to enforce ownership exactly as it did for the two separate calls each replaces.

### Changed

- `ApplicationRepository.create` now calls `create_application_with_genesis` via `supabase.rpc(...)` instead of a plain `.insert()`. Its return shape (the full `applications` row) and every existing error code it can surface (`23514` check violation, `23503` foreign key violation) are unchanged, so `ApplicationService.create`'s error-mapping needed no changes.
- `ApplicationRepository` gained `transitionStatus(userId, applicationId, previousStatus, newStatus, applicationDate?)`, calling `transition_application_status` via RPC.
- `ApplicationService.create` no longer performs a separate, best-effort genesis insert after creating the application - that insert is now part of the same atomic RPC call, so the prior `console.error`-on-failure fallback path no longer exists (there is nothing left for it to guard against).
- `ApplicationStatusService.changeStatus` now makes one call to `ApplicationRepository.transitionStatus` instead of two sequential repository calls (`ApplicationRepository.update` for the date, `ApplicationStatusHistoryRepository.createTransition` for the history row). The two previously-distinct failure messages ("while setting the application date" / "while updating the status") are now one ("while updating the status"), since there is only one write operation to fail.
- `ApplicationStatusHistoryRepository` lost `createGenesis` and `createTransition` (both now unused - their callers were replaced above) and is read-only as a result (`listByApplication`, `listByApplicationIds` only).
- `src/types/supabase.ts` - added a `Functions` entry for both RPCs (previously `Record<never, never>`), so both are fully typed at the call site with no `any`.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` (93 tests, 11 files) all pass. `application-status.service.test.ts` was updated to mock `ApplicationRepository.transitionStatus` in place of the two calls it replaces.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4 (no confirmed, reachable Supabase test account). The migration SQL was reviewed by hand for RLS/constraint interaction (see its own header comment) but not executed.

---

## Phase 21 — Analytics SQL Views (2026-07-20)

Implemented the four SQL views `DATABASE.md` reserved (`dashboard_metrics`, `cv_statistics`, `company_statistics`, `monthly_statistics`), per `IMPLEMENTATION_ORDER_V2.md`. Company/CV/Monthly Analytics' counts and the Overview's counts are now computed by `GROUP BY` in the database instead of being filtered/counted in memory. No Analytics formula, business rule, or output value changed - see "Scope and reasoning" below for what deliberately stayed unchanged and why.

### Added

- `supabase/migrations/20260720100000_analytics_statistics_views.sql` - four views, each performing pure per-status counting via `GROUP BY` (every `application_status` enumerated as its own count column). None categorises what a status "means" (interview, offer, response) - that decision stays entirely in `application.constants.ts`/`analytics-calculations.ts`, unchanged. All four are `security_invoker`, with an explicit `user_id = (select auth.uid())` filter as defense in depth on top of RLS - the same pattern already used throughout this schema.
- `src/features/analytics/repositories/analytics.repository.ts` (new) - the feature's first Repository, querying the four views only.
- `src/features/analytics/utils/analytics-calculations.ts` gained `computeGroupAnalyticsFromStatistics` (counts/rates from a view row, Average Response Time still computed from the existing bulk applications/history data grouped by the same key) and `deriveOverviewCounts` (adapts a `dashboard_metrics` row into the same `{total, interviews, offers, responded}` shape `computeOverview` already took). Both are additive - `computeGroupAnalytics` and `computeOverview` themselves are unchanged, still used for Source Analytics and still the one place rate/gating logic lives, respectively.
- `analytics-calculations.test.ts` - a parity test asserting `computeGroupAnalyticsFromStatistics` produces results identical to `computeGroupAnalytics` for the same underlying applications, plus coverage for `deriveOverviewCounts`.

### Changed

- `AnalyticsService.getSummary` now fetches the four views (via `AnalyticsRepository`) alongside the existing bulk applications read, in the same `Promise.all`. Company/CV/Monthly Analytics and the Overview are built from the views; Source Analytics, Funnel Analytics, Insights, and Average Response Time are computed exactly as before, from the same bulk applications/status-history reads already fetched.
- `AnalyticsService` no longer calls `ApplicationStatsService.getDashboardCounts` - the Overview's counts now come from `dashboard_metrics`. `ApplicationStatsService`/`DashboardService` themselves are untouched; the Dashboard page's own KPI counts still use the original `countByStatuses` queries, unaffected by this phase.
- `src/types/supabase.ts` - added `Views` entries for all four views (previously `Record<never, never>`).

### Scope and reasoning

- **Source Analytics was not moved to a view.** `DATABASE.md` reserves no `source_statistics` name, and `IMPLEMENTATION_ORDER_V2.md` Phase 21 lists only the four views above - adding a fifth would be scope beyond what this phase defines. `computeGroupAnalytics` (unchanged) still computes it from the bulk applications read.
- **Average Response Time was not moved into any view**, even for the three groupings a view does cover. It needs a per-application status-history timestamp (the transition immediately after Applied), not a status count - moving it into SQL would mean duplicating date arithmetic in four places with no way to verify it against a live database in this environment (no confirmed Supabase test account has been reachable at any point in this project - see every prior phase's "Real data not verified" entries). Keeping it in `analytics-calculations.ts`, already covered by existing unit tests, was the lower-risk choice given this phase's explicit requirement that output remain identical.
- **Funnel Analytics and Insights were not touched.** Neither has a corresponding view; both are entirely derived from data (full status-history facts, or the other computed arrays) that a per-status count view cannot supply.
- Because Source Analytics still requires the full bulk applications read, this phase does not eliminate that read - it removes the JS-side counting/filtering work for three of the four groupings, running concurrently (`Promise.all`) with the read that Source Analytics/Funnel/Insights still need.

### Verification

- Added a parity test (see "Added" above) directly comparing `computeGroupAnalyticsFromStatistics`'s output against `computeGroupAnalytics`'s output for identical underlying application data - both produce the same `applications`/`responses`/`interviews`/`offers`/`accepted`/`rejected`/rates/`averageResponseTimeDays` values.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` (97 tests, 11 files) all pass.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4. The view SQL was reviewed by hand for RLS (`security_invoker` + explicit `user_id` filter) and grouping-key correctness (in particular `monthly_statistics`'s `to_char(application_date, 'YYYY-MM')` matching `application_date.slice(0, 7)` exactly) but not executed.

### Post-Phase 21 cleanup

- Removed `DashboardMetricsRow` from `analytics.repository.ts` - an unused exported type left behind once `deriveOverviewCounts` was written against the more precise `StatusCountColumns` instead. No behavior change; confirmed via a full quality-gate run (typecheck/lint/test/build all unchanged).

---

## Phase 22 — Composite-FK Embedded-Query Verification (2026-07-20)

Re-examined `ApplicationRepository.list`'s composite-FK embedded query (open since Phase 8), per `IMPLEMENTATION_ORDER_V2.md`. No feature, business rule, or code change - this phase's own definition scopes it to verification, with a code change only if verification failed.

### Reviewed

- `companies!inner(name), cv_versions!inner(name)` in `ApplicationRepository.list` (and the identically-shaped `findById`/`listAllForAnalytics`/`listAllIncludingArchived`), embedded through the composite foreign keys `applications_company_owner_fk`/`applications_cv_version_owner_fk` (`(company_id, user_id)` / `(cv_version_id, user_id)`). Re-examined against PostgREST's documented composite-FK embedding behavior: exactly one FK path connects `applications` to `companies` and exactly one to `cv_versions` - no relationship ambiguity for PostgREST to resolve, despite `user_id` also belonging to a separate FK to `users`. A composite FK embed joins on every column of the constraint, matching the ownership semantics this schema already depends on elsewhere; `unique (id, user_id)` on both target tables guarantees the single-row match `!inner` requires. Full reasoning recorded in `KNOWN_ISSUES.md`.

### Changed

- None. Per this phase's explicit instruction ("if an embedded query already behaves correctly, leave it unchanged"), the conclusion above did not warrant applying the documented fallback, so `ApplicationRepository.list`/`ApplicationService.list` were left untouched.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` (97 tests, 11 files) all pass, unchanged from before this phase (no source file was modified).
- Not executed against a live database in this environment - same persistent limitation as every phase since Phase 4. The conclusion above is reasoning-based, not execution-verified; `KNOWN_ISSUES.md` records this explicitly and keeps the fallback ready in case a future live confirmation contradicts it.

---

## Phase 23 — Billing Infrastructure & Subscription Data Model (2026-07-21)

Introduced the project's first Route Handler and its first external paid-service dependency, and established the subscription data model, per `IMPLEMENTATION_ORDER_V2.md`. Infrastructure only - no Stripe checkout, no subscription enforcement, no usage limits, no billing UI. Nothing reads the new table to gate a feature yet.

### Added

- **Dependency**: `stripe` (official Node SDK, v22.3.2) - approved before installation per `IMPLEMENTATION_RULES.md`. Needed for correct, timing-safe webhook signature verification (`stripe.webhooks.constructEvent`); hand-rolling this is a real security risk the SDK exists specifically to avoid.
- `supabase/migrations/20260721090000_billing_subscriptions.sql` - `subscription_plan` (`free`/`pro`) and `subscription_status` (mirrors Stripe's own `Subscription.status` values exactly) enums; the `subscriptions` table (one row per user, `plan` defaults to `free`, RLS read-only for the owning user with no client-writable policy at all); extends `handle_new_user` to also insert the genesis subscription row, the same multi-insert-in-one-function shape `create_application_with_genesis` (Phase 20) already established.
- `src/lib/stripe.ts` - lazy Stripe client + webhook-secret accessors. Deliberately not constructed at module load, so `next build`'s Route Handler collection never fails just because Stripe isn't configured in this environment (it isn't - no live Stripe project exists here, same category of limitation as every unconfigured live service throughout this project).
- `src/lib/supabase/admin.ts` (new) - a Supabase client using the service-role key, bypassing RLS. Lazily constructed for the same build-safety reason as `lib/stripe.ts`. See "Architecture decision" below for why this was needed now rather than in the originally planned Phase 39.
- `src/features/billing/{types,repositories,services}` - `BillingRepository` (normal RLS-protected read, `getByUserId`), `BillingWebhookRepository` (admin-client write, `syncByStripeCustomerId` - update-only, never creates a row), `BillingService` (thin pass-through read, unused by anything yet), `BillingWebhookService` (translates a verified Stripe subscription event into the table's own columns - mechanical field mapping only, never touches `plan`).
- `src/app/api/webhooks/stripe/route.ts` - the application's first Route Handler. Verifies the Stripe signature, then delegates to `BillingWebhookService`. Returns 400 on a missing/invalid signature, 500 if processing the verified event fails (so Stripe's own retry mechanism can recover from a transient error), 200 otherwise.
- `.env.example` - added `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`SUPABASE_SERVICE_ROLE_KEY` was already present, unused until now).

### Changed

- `src/config/env.ts` - added `stripeSecretKey`, `stripeWebhookSecret`, `supabaseServiceRoleKey`, all optional (not `requireEnvVar`'d) since only the webhook route depends on them and the app must keep building/running without them configured.
- `src/types/supabase.ts` - added the `subscriptions` table and the two new enums.

### Architecture decisions

- **Two approval checkpoints before writing code**, per `IMPLEMENTATION_RULES.md`'s dependency-approval and "when to stop: a paid service is required" rules: (1) whether to install the `stripe` package at all, (2) how the webhook should write to `subscriptions` given Stripe's request carries no Supabase session. Both were raised to and answered by the user before implementation began.
- **Service-role client introduced in this phase, not Phase 39 as originally planned.** A plain RLS policy cannot express "trust this request because Stripe's signature was already verified in application code" - RLS only ever sees `auth.uid()`, which is null for a Stripe-originated request. A `SECURITY DEFINER` RPC callable by `anon` was considered and rejected: granting `anon` execute would make the function directly callable by anyone with the public anon key via Supabase's REST API, completely bypassing the Route Handler's own signature check. The service-role client, used only inside this one already-verified Route Handler, is the standard, secure pattern for this exact situation. `ARCHITECTURE.md` "Repositories" now documents this as a second, narrow exception alongside the existing RPC-for-atomicity one, and `BillingWebhookRepository` is kept in its own file so this elevated-privilege path stays isolated and auditable, mirroring `AuthRepository`/`AuthBrowserRepository`'s existing split.
- **The webhook never writes `plan`.** Only `status`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end` are ever touched, mirroring Stripe's payload as-is. Deciding what `plan` should be is a real product decision (`BUSINESS_RULES.md` "Billing" - drafted, not yet enforced) left entirely to Phase 24.
- **The webhook only updates, never creates, a `subscriptions` row.** Without Stripe Checkout (explicitly out of scope this phase), there is no reliable way for a webhook alone to know which user a brand-new `stripe_customer_id` belongs to. Every user already has a row from `handle_new_user`, so this is a safe, intentional no-op until Phase 24 links a customer id to a user during checkout.

### Documentation updated

- `DATABASE.md` - new "Version 2 Tables" section (`subscriptions`, fully documented) and the two new enums.
- `ARCHITECTURE.md` - new "Route Handlers" subsection (scoped to external-service entry points only); "Repositories" extended with the service-role exception.
- `BUSINESS_RULES.md` - new "Billing" section, explicitly marked drafted/not yet enforced.
- `DEPLOYMENT.md` - `SUPABASE_SERVICE_ROLE_KEY` moved from "not used by the current MVP" to "required for the billing webhook"; added `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (97 tests, 11 files, unchanged), and `npm run build` all pass. The build correctly collects `/api/webhooks/stripe` as a dynamic route without failing on the missing Stripe/service-role environment variables, confirming the lazy-construction design works as intended.
- Not verified against a live Stripe project or live database in this environment - same persistent limitation as every phase since Phase 4. The Stripe SDK's actual type shapes (e.g. `current_period_end` living on `subscription.items.data[]`, not the top-level `Subscription` object, in SDK v22) were confirmed by inspecting the installed package's own type declarations, not by receiving a real webhook.

---

## Phase 24 — Plan Gating Enforcement (2026-07-21)

Applied the Phase 23 subscription model to actually gate two existing MVP features behind the Pro plan, per `IMPLEMENTATION_ORDER_V2.md`. No Checkout, no Customer Portal, no payment UI, no subscription management beyond this - a Free plan user has no way to become Pro yet (that remains a later phase), so this enforcement is real but currently unreachable-to-bypass for every existing account, the same "infrastructure ahead of capability" situation Phase 23's webhook was already in.

### Two clarifications requested and answered before implementation

`VALUE_PROPOSITION.md` names "Unlimited applications" as Pro-only (implying a Free cap) and "Advanced analytics/filtering/insights" as Pro-only, but neither document specifies the actual Free-plan number, nor which parts of the single, undifferentiated Analytics page would count as "basic" vs "advanced." Per `IMPLEMENTATION_RULES.md` ("if documentation is incomplete: stop... never guess"), both were raised to the user before writing code:

1. Free-plan application limit: **25**, confirmed by the user.
2. Analytics/filtering tiering: **not gated this phase** (confirmed by the user) - inventing a basic/advanced split the docs never define would mean inventing functionality, and any locked-section treatment would itself be a form of payment UI, explicitly excluded this phase. Deferred to a future phase once the split is actually decided.

### Added

- `src/features/billing/constants/billing.constants.ts` - `FREE_PLAN_APPLICATION_LIMIT = 25`, the single source of truth for the number.
- `BillingService` gained `requireProPlan(userId)` and `requireApplicationCapacity(userId)`, both returning the same `ActionResult<true>` allow/deny shape `AuthService.requireUserId` already established for authentication. All entitlement logic (reading `plan`, counting applications, comparing against the limit) lives here and only here - callers never inspect `plan` or count anything themselves.
- `src/features/billing/services/billing.service.test.ts` - covers both guards: Free vs. Pro, at/under/over the limit, no subscription row, and repository failures.
- Two new tests in the existing `export.service.test.ts` (see "Fixed" below) confirming a Free plan user is denied before any data is read.

### Changed

- `ApplicationService.create` now calls `BillingService.requireApplicationCapacity(userId)` first (`BUSINESS_RULES.md` "Billing" - Application Limit). The count is of active (non-archived) applications only, via `ApplicationRepository.countByStatuses(userId)` - the same generic, business-rule-free counting primitive `ApplicationStatsService` (a different feature's Service) already reuses for its own purposes, so no new counting mechanism was introduced.
- `ExportService.exportCSV` and `.exportJSON` now call `BillingService.requireProPlan(userId)` first (`BUSINESS_RULES.md` "Billing" - Export). The Stripe webhook (`app/api/webhooks/stripe`, `BillingWebhookService`, `BillingWebhookRepository`) was not touched - no bug was found in it.
- No new UI was added. Both gates return a business error through the existing `ActionResult` → toast pipeline every other business-rule rejection already uses (e.g. `CompanyService`'s duplicate-name rejection) - confirmed by inspecting `ExportMenu.tsx`'s existing `if (!result.success) toast.error(result.error.message)` handling, which needed no changes to correctly surface the new messages.

### Fixed

- `export.service.test.ts` (pre-existing, from an earlier phase) needed `BillingService` mocked once `ExportService` gained a new dependency on it - otherwise the real module chain loaded and failed on missing Supabase environment variables, the same category of fix `application-status.service.test.ts` needed during Phase 20.

### Documentation updated

- `BUSINESS_RULES.md` - "Billing" section finalized: the two enforced limits, and an explicit "Not Yet Enforced" note naming Analytics/filtering tiering as deliberately deferred rather than silently skipped. Also documents that entitlement is decided by `plan` alone (not `status`), and that this is currently unreachable since nothing sets `plan` to `pro` yet.
- `API.md` - Create Application and both Export endpoints marked plan-gated, with the concrete limit/requirement stated.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (107 tests, 12 files - 10 new: `billing.service.test.ts`'s 9, plus 2 new Export-denial tests, minus none removed), and `npm run build` all pass.
- Confirmed via `grep` that no other existing test file broke from the two new cross-feature imports (`ApplicationService`/`ExportService` → `BillingService`).
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4. Every scenario above was exercised through mocked repositories, not a live Supabase project.

---

## Phase 25 — Vercel Connection & External Monitoring (2026-07-21)

Production-readiness review, per `IMPLEMENTATION_ORDER_V2.md`. Documentation only - no source file changed, no new dependency, no new service.

### Reviewed

- **Vercel connection.** `.github/workflows/ci.yml` already runs Type Check, Lint, Build, and Unit Tests on every push/PR to `main`, exactly matching `DEPLOYMENT.md`'s "Continuous Integration"/"Continuous Deployment" requirements - no gap found, no change needed. Connecting the GitHub repository to Vercel itself remains a manual, dashboard-side step this environment cannot perform (no Vercel account/dashboard access exists here) - unchanged status since Phase 18.
- **External monitoring.** No document (`DEPLOYMENT.md`, `PROJECT_CONSTRAINTS.md`, or any other) names a monitoring vendor. Per this phase's explicit "if documentation is incomplete or ambiguous, stop and ask - never guess" instruction, this was raised to the user before writing any code, since introducing one would mean a new paid dependency requiring approval and real credentials this environment cannot obtain.

### Decision

The user chose to defer external monitoring entirely this phase, rather than naming a vendor now. Vercel Logs/Supabase Logs/Browser Console remain the tooling, unchanged from the MVP. No `lib/monitoring.ts` was created, no dependency was installed. Revisit once a specific vendor is chosen.

### Documentation updated

- `DEPLOYMENT.md` - "Continuous Deployment" section notes CI is confirmed sufficient and the Vercel connection remains outstanding; "Monitoring" section notes the deferral and why.

### Verification

- No source file changed. `npm run typecheck`, `npm run lint`, `npm run test` (107 tests, 12 files, unchanged), and `npm run build` re-run to confirm nothing regressed - all pass, identical to Phase 24's results.

---

## Phase 26 — Restore / Unarchive (2026-07-21)

Completed the soft-delete lifecycle for Companies, CV Versions, and Applications by adding the missing restore path, per `IMPLEMENTATION_ORDER_V2.md`. No changes to Billing, Analytics, or Dashboard.

### Added

- `restore(userId, id)` and `listArchived(userId, params)` on `CompanyRepository`/`CompanyService`, `CVVersionRepository`/`CVVersionService`, and `ApplicationRepository`/`ApplicationService`. `listArchived` mirrors each entity's existing `list` shape (paginated), filtered to archived rows only, ordered by most-recently-archived first (`updated_at desc`) - a new, separate method rather than an `includeArchived` branch on the widely-used `list`, the same isolation choice `listAllIncludingArchived` (Phase 14) already established for Export.
- `restoreCompanySchema`, `restoreCVVersionSchema`, `restoreApplicationSchema`, and `restoreCompanyAction`/`restoreCVVersionAction`/`restoreApplicationAction` - each mirrors its sibling `archive*` schema/action exactly.
- An `archived` boolean added to each entity's `listXSchema` (query-string driven, only the literal string `"true"` means true - a stray `?archived=false` doesn't accidentally flip on via JS's truthy-string coercion, which plain `z.coerce.boolean()` would have done).
- Each list page (`/companies`, `/cv-versions`, `/applications`) gained an "Archived" toggle link and, when active, calls `listArchived` instead of `list`. `CompaniesTable`/`CVVersionsTable`/`ApplicationsTable` each gained an `archived` prop that swaps Edit/Archive for a single Restore action - the same table component is reused rather than a parallel "Archived*Table," since only the available row actions differ, not the row shape.
- For Applications specifically: View and Edit are omitted (not just hidden) on archived rows, since both require an active application (`ApplicationService.getById`/the edit form both depend on the same active-only read every other archived-row access already respects) - they would not work until the row is restored.

### Business rules (`BUSINESS_RULES.md` "Restore", new section)

- Restoring a Company or CV Version re-validates the same per-user uniqueness rule Create/Update already enforce - the existing partial unique index (`(user_id, lower(name)) WHERE deleted_at IS NULL`) is the real enforcement, mapped to the same friendly conflict message pattern `create`/`update` already use for the identical `23505` error code. No separate pre-check query was added, since the archived row's own name never changes as part of restoring it.
- Applications have no uniqueness or reference-count rule to re-validate on restore (`BUSINESS_RULES.md` "Duplicate Applications": duplicates are allowed) - a plain, unconditional restore once ownership is confirmed.
- Restoring never rewrites history - it only reverses the one field (`deleted_at`) soft-delete itself set.

### Fixed

- `company.schema.test.ts` (pre-existing) needed one assertion updated once `listCompaniesSchema` gained the new `archived` field; a new test was added confirming only the literal string `"true"` is treated as archived.

### Documentation updated

- `BUSINESS_RULES.md` - new "Restore" section.
- `API.md` - new "Restore Application"/"Restore Company"/"Restore CV Version" operations; each "Get" endpoint notes its new `archived` filter.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (108 tests, 12 files - 1 new), and `npm run build` all pass.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 27 — Dedicated Search Results Page (2026-07-21)

Gave Search a full results page beyond the header dropdown's fixed result cap, per `IMPLEMENTATION_ORDER_V2.md`. No new business logic, no new repository - reuses `SearchService`/`CompanyService`/`ApplicationService`/`ApplicationNoteService` entirely.

### Added

- `app/(dashboard)/search/page.tsx` - a Server Component calling `SearchService.search` directly (the same pattern every other list page already uses to call its own Service, never through a Server Action). Three sections (Companies, Applications, Notes), each with its own independent pagination via its own query param (`companiesPage`/`applicationsPage`/`notesPage`) - the three result sets have no natural combined ordering, so one shared pagination cursor across all of them isn't meaningful.
- `ROUTES.SEARCH` (`/search`) - not added to the Sidebar (`UI_SYSTEM.md`'s Sidebar list is unchanged); reached only via the dropdown's new "View all results" link.
- `SEARCH_PAGE_LIMIT` (20) in `search.constants.ts` - the page's page size, matching the default every other paginated list page already uses. `SEARCH_RESULT_LIMIT` (5, the dropdown's cap) is unchanged.
- `searchPageSchema` in `search.schema.ts` - sanitizes the page's searchParams (`query`, `companiesPage`, `applicationsPage`, `notesPage`), mirroring `listCompaniesSchema`'s fallback-instead-of-error approach. Kept separate from `searchSchema` (the dropdown's Server Action input schema) since the input source and shape genuinely differ.
- `GlobalSearch` gained a "View all results" link at the bottom of the dropdown's results panel, linking to `/search?query=...`.

### Changed (additive - existing dropdown behaviour is unchanged)

- `SearchService.search` gained an optional third `params` argument (`companiesPage`/`applicationsPage`/`notesPage`/`limit`, all optional). The existing call site (`searchAction`, used by the dropdown) passes no third argument, so it defaults to page 1 and `SEARCH_RESULT_LIMIT` for every entity - identical to before this phase.
- `SearchResults` gained `companiesTotal`/`applicationsTotal`/`notesTotal` (additive fields) so the dedicated page can render `PaginationControls`; `GlobalSearch` ignores them.
- `ApplicationNoteService.search` now takes a `{page, limit}` object (matching `CompanyService.list`/`ApplicationService.list`'s existing convention) instead of a flat `limit`, and returns `{notes, total}` instead of a bare array - needed for Notes to be paginated at all. Verified via `grep` that `SearchService` is this method's only caller, so this change is fully contained within the Search feature's dependency chain.
- `ApplicationNoteRepository.searchByContent` now takes `{page, limit}` and uses `.range()` with an exact count instead of a flat `.limit()` - the underlying data-access change `ApplicationNoteService.search` required. Same containment: its only caller is `ApplicationNoteService.search`.

### Documentation updated

- `UI_SYSTEM.md` - new "Search Page" section, matching the pattern already used for Dashboard/Analytics/Applications/Companies/CV Versions.
- `API.md` - "Search" section documents the three new pagination parameters.
- `KNOWN_ISSUES.md` - the Phase 13 "No dedicated Search results page" entry marked resolved.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (110 tests, 12 files - 2 new, both in the updated `search.service.test.ts`), and `npm run build` all pass. The build correctly collects `/search` as a route.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 28 — Markdown Rendering for Notes (2026-07-21)

Closed the gap between `BUSINESS_RULES.md`'s stated "Markdown supported" and the actual display (plain text, `whitespace-pre-wrap`), per `IMPLEMENTATION_ORDER_V2.md`. No database change - `application_notes.content` was already stored as raw Markdown text; only how it renders changed.

### Phase numbering note

This session's instructions initially described "Phase 28" as Interview Feedback, which conflicts with this document's own Phase 28 ("Markdown Rendering for Notes") - Interview Feedback is documented here as Phase 30. Raised to the user before writing any code, per `IMPLEMENTATION_RULES.md`'s "if documentation is ambiguous, stop and ask - never guess." The user confirmed: implement this document's actual Phase 28 (Markdown Rendering for Notes) as originally sequenced; Interview Feedback remains Phase 30, unimplemented.

### Technical decisions

- **Dependency**: `react-markdown` (v10.1.0) - approved before installation per `IMPLEMENTATION_RULES.md`. Renders straight to React elements rather than `dangerouslySetInnerHTML`, so no separate sanitizer is needed, and it does not render embedded raw HTML by default - matching `BUSINESS_RULES.md` "Notes": "Rich text is not" supported. No additional plugins (e.g. `remark-gfm`) were added - notes are simple free text, and CommonMark (bold/italic/lists/links) is sufficient without an established requirement for GitHub-flavoured extras.
- `npm audit` reported 7 vulnerabilities after installation (4 moderate, 3 high). Traced each via `npm ls`: all are pre-existing, transitive dependencies of `shadcn`/`next` (`fast-uri`/`@hono/node-server`/`@modelcontextprotocol/sdk` via `shadcn`; `postcss`/`sharp` via `next`, the same pre-existing advisory already noted in this file's Phase 1 entry) - `react-markdown` itself introduces none. No action taken, consistent with Phase 1's precedent (the only fixes require a Next.js/shadcn downgrade).
- No typography plugin (e.g. `@tailwindcss/typography`) was added - a second new dependency for this alone would have been disproportionate. A small, explicit set of Tailwind utility classes on the rendering container covers what Preflight's reset otherwise strips from Markdown's output (list markers/indentation, paragraph spacing, link styling).

### Changed

- `ApplicationNotesList.tsx` - `note.content` now renders via `<ReactMarkdown>` instead of a plain `<p className="whitespace-pre-wrap">`. The only file changed; no Repository, Service, Server Action, or schema was touched - this was purely a display-layer change, since content was already stored correctly.

### Documentation updated

- `KNOWN_ISSUES.md` - the Phase 10 "No markdown rendering" entry marked resolved.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (110 tests, 12 files, unchanged - no existing test covers this component's rendering), and `npm run build` all pass.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4. The rendering itself was verified by code review (no dependency on live data), not by viewing it in a browser against real notes.

---

## Phase 29 — Analytics Completion (2026-07-22)

Implemented the five metrics `ANALYTICS_ENGINE.md`/`FEATURES.md` documented but Phase 12 never built, per `IMPLEMENTATION_ORDER_V2.md`: Acceptance Rate (top-level), Average Offer Time, Average Hiring Time, Work Mode Analytics, Employment Type Analytics, and Trend Analysis. No database change - all five reuse the existing bulk applications/history fetch and/or Phase 21's `dashboard_metrics`/`monthly_statistics` views; no new view was added. No changes to Billing, Search, Restore/Archive, Markdown Notes, or Dashboard.

### Added

- `AnalyticsOverview.acceptanceRate` (`RateMetric`) - Accepted Offers / Offers, sourced from the existing `dashboard_metrics` view row (`deriveOverviewCounts` now also derives `accepted`). Gated only on having at least one offer (no minimum sample size is documented for this metric, unlike Interview/Offer Rate's 5-application threshold), since its denominator is Offers, not Total Applications.
- `AnalyticsOverview.averageOfferTimeDays` / `averageHiringTimeDays` - "Application Date -> Offer"/"-> Accepted", averaged across the whole account (not per Company/CV/Source/Monthly grouping, which already has its own Average Response Time column). `ApplicationHistoryFacts` gained `offerEnteredAt`/`acceptedEnteredAt`, populated in `buildHistoryFactsByApplication` the same way `respondedAt` already was - each set at most once per application, since Offer's only outgoing transitions are to Accepted/Rejected and Accepted is terminal. `computeAverageResponseTimeDays` was refactored into a shared `computeAverageDaysBetween` helper, reused by the two new `computeAverageOfferTimeDays`/`computeAverageHiringTimeDays` functions, so the "Application Date -> event" averaging logic exists in exactly one place.
- `AnalyticsSummary.workModeAnalytics` (`WorkModeAnalyticsRow[]`) and `.employmentTypeAnalytics` (`EmploymentTypeAnalyticsRow[]`) - grouped by `work_mode`/`employment_type` from the same bulk `listAllForAnalytics` fetch Source Analytics already groups in application code, since neither `DATABASE.md` view name is reserved (`work_mode_statistics`/`employment_type_statistics`). Each has its own, smaller column set matching exactly what `ANALYTICS_ENGINE.md` documents for that grouping (Work Mode: Applications/Interview Rate/Offer Rate/Acceptance Rate; Employment Type: Applications/Responses/Offers/Average Response Time) rather than reusing the broader `GroupAnalyticsRow` shape. `AnalyticsApplicationRow` and `ApplicationRepository.listAllForAnalytics`'s select list gained `work_mode`/`employment_type` (both columns already existed on `applications`; no migration needed).
- `AnalyticsSummary.trend` (`TrendAnalysis | null`) - "current month vs. previous month" Application/Interview/Offer/Response Growth percentages, derived from the already-computed `monthlyAnalytics` (the last two entries in its ascending-sorted array) rather than a new data source - "Do not duplicate analytics calculations in multiple places". `null` below the documented 2-month minimum (`MIN_SAMPLE_TREND_MONTHS`); an individual growth figure is `null` when its previous-month count was zero (avoids a division by zero, not itself a documented threshold).
- UI: `AnalyticsRateCards` gained a fourth "Acceptance Rate" card. New components `AnalyticsTimeMetrics` (Average Offer/Hiring Time cards), `WorkModeAnalyticsTable`, `EmploymentTypeAnalyticsTable` (each a `DataTable` with its own column set, mirroring `AnalyticsComparisonTable`'s structure but not its shape), and `TrendAnalysisCard`. All wired into `analytics/page.tsx` as new sections; none define a metric of their own - every number rendered was already computed by `AnalyticsService`.

### Documentation updated

- `ANALYTICS_ENGINE.md` - each of the six newly-implemented sections (Acceptance Rate, Average Offer Time, Average Hiring Time, Work Mode Analytics, Employment Type Analytics, Trend Analysis) marked "Implemented (Version 2, Phase 29)".
- `KNOWN_ISSUES.md` - the Phase 12 "Several ANALYTICS_ENGINE.md / FEATURES.md metrics are intentionally not implemented" entry marked resolved.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (121 tests, 12 files - 11 new, covering `computeAverageOfferTimeDays`/`computeAverageHiringTimeDays`, `computeWorkModeAnalytics`, `computeEmploymentTypeAnalytics`, `computeTrendAnalysis`, and `computeOverview`'s new Acceptance Rate/time-metrics behavior), and `npm run build` all pass.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4. Every new formula was verified by code review and by tracing it against `ANALYTICS_ENGINE.md`'s definitions, and by unit tests against synthetic status-history data, not by exercising it against real historical application data.

---

## Phase 30 — Interview Feedback (2026-07-22)

Let users attach structured feedback to a specific Status History entry, per `IMPLEMENTATION_ORDER_V2.md`. This is Version 2's final phase. New `interview_feedback` table and a new `src/features/interview-feedback` feature; no changes to Billing, Search, Restore/Archive, Markdown Notes, Analytics, or Dashboard.

### Planning decisions (approved before writing code)

- **Rating scale**: no document defined one - approved as a 1-5 integer scale, enforced by a database check constraint and a Zod bound. Nullable: a user may leave notes without rating.
- **Format field**: no document defined its values - approved as a new `interview_format` enum (Phone, Video, On-site, Technical, Behavioral) describing how the interview itself was conducted, independent of the application's own `work_mode`.
- Both were raised via clarifying questions before any code was written, per `IMPLEMENTATION_RULES.md`'s "if documentation is incomplete, stop and ask - never guess."

### Added

- Migration `20260722090000_interview_feedback.sql`: `interview_format` enum; `interview_feedback` table (`application_status_history_id` FK, `user_id`, `rating`, `format`, `notes` (required, mirrors `application_notes.content`), timestamps, `deleted_at`). Unlike `application_notes`, this table has its own `user_id` column (the same shape `applications`/`companies`/`cv_versions` already use) - RLS's insert/update policies additionally require the referenced `application_status_history` row to belong to an application owned by that same user, so ownership is both declared (`user_id`) and inherited (through Status History), matching this phase's own documentation requirement.
- New feature `src/features/interview-feedback/{types,constants,schemas,repositories,services,actions,components}`: `InterviewFeedbackRepository` (data-access only, filters every query by `user_id` directly - the same pattern `ApplicationRepository`/`CompanyRepository` already use, not the "resolve ownership through a join" pattern `application_notes` needs); `InterviewFeedbackService` (`listForApplication`/`create`/`update`/`archive`) - `create` verifies the target `application_status_history_id` actually belongs to the given application by calling `ApplicationStatusService.listHistory` (which already re-verifies the application itself is owned by this user) and checking the id is present in the result, reusing Applications' own Service rather than adding a new Repository method or duplicating ownership logic; Server Actions mirroring `application-note.actions.ts`'s shape exactly.
- UI: `InterviewFeedbackForm`/`InterviewFeedbackFormDialog` (mirror `ApplicationNoteForm`/`ApplicationNoteFormDialog`) and `InterviewFeedbackPanel` (mirrors `ApplicationNotesList`'s edit/archive-with-confirm pattern, applied per Status History entry instead of per application - any number of feedback entries may exist per stage). `ApplicationStatusTimeline` gained a `renderFeedback(historyId)` render-prop slot instead of importing Interview Feedback directly - the same prop-injection pattern `TopNav` already uses for `search`/`exportMenu`, so the Applications feature stays decoupled from the new one. The Application Detail page fetches feedback via `InterviewFeedbackService.listForApplication`, groups it by `application_status_history_id`, and supplies `renderFeedback` to the timeline - the only Applications-feature file touched, matching this phase's own "Application Detail page" file-list entry.

### Documentation updated

- `DATABASE.md` - new "interview_feedback" table section (Version 2 Tables) and `interview_format` enum.
- `BUSINESS_RULES.md` - new "Interview Feedback" section: ownership inherited through Status History, append/edit rules (any number of entries per stage, editable/archivable by their owner, Status History itself remains untouched).
- `API.md` - new "Interview Feedback" endpoints section; removed from "Future Endpoints".
- `FEATURES.md` - new "Feature 14 - Interview Feedback (Version 2, Phase 30)"; removed from "Future Features".

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (131 tests, 13 files - 10 new, covering `InterviewFeedbackService`'s ownership checks, defaults, and not-found paths), and `npm run build` all pass.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4.

### Version 2 complete

Phase 30 was the last phase in `IMPLEMENTATION_ORDER_V2.md`. Every phase from 19 through 30 has been implemented, reviewed, and documented.

---

## Phase 31 — Pro Plan Foundation (2026-07-23)

Reduced the Free plan's active application limit from 25 to 15. No other behavior changed: every feature remains available on the Free plan, Pro remains unlimited, and Export remains Pro-only.

### Phase numbering note

This session's instructions labeled this "Phase 31," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 31 ("Recruiter / Contact Tracking," unimplemented). Version 2 (Phases 19-30) was already complete as of the previous entry, and this change is a standalone policy adjustment to the existing Phase 24 billing enforcement, not a new roadmap phase - it does not claim or displace the document's actual Phase 31. Recorded under this label only to match the session's own request.

### Changed

- `FREE_PLAN_APPLICATION_LIMIT` (`src/features/billing/constants/billing.constants.ts`): `25` → `15`. This is the single source of truth `BillingService.requireApplicationCapacity` reads - no other file hardcodes the number. The rejection message, built from the constant (`` `The Free plan is limited to ${FREE_PLAN_APPLICATION_LIMIT} applications...` ``), updates automatically; no separate UI string existed to find or change.

### Documentation updated

- `BUSINESS_RULES.md` - "Application Limit" now states 15, noting it was reduced from 25 (Phase 31).
- `API.md` - "Create Application" plan-gating note now states 15.
- `USER_GUIDE.md` - both mentions of the Free plan limit (Managing Applications, FAQ) updated to 15.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run test` (131 tests, 13 files, unchanged), and `npm run build` all pass. `billing.service.test.ts`'s existing tests assert against `FREE_PLAN_APPLICATION_LIMIT` symbolically (e.g. `count: FREE_PLAN_APPLICATION_LIMIT - 1`), not a literal `25`, so they validate the new limit automatically with no test-file changes required.
- Confirmed via `grep` that no other source file, test, or UI string hardcodes the old value `25` in a billing/application-limit context.
- Not verified against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 31.5 — Subscription & Billing Experience (2026-07-23)

Built the complete surrounding UX for the Free/Pro plans - a Pricing page, a Subscription section in Settings, a live usage indicator, and polished upgrade/limit dialogs - without changing any entitlement, Stripe integration, or server-side validation. No new premium feature was introduced; every Pro-only capability listed on the new Pricing page already existed (Export) or is explicitly marked "Coming Soon."

### Scope clarification

Labeled "Phase 31.5" per this session's own request - not a numbered phase in `IMPLEMENTATION_ORDER_V2.md` (see the Phase 31 numbering note above). This is UI/UX work layered onto the existing, unchanged Phase 23/24 billing foundation.

### Checkout/Customer Portal decision

No Stripe Price IDs, Checkout Session creation, or Customer Portal code exist anywhere in this codebase - Phase 24 explicitly excluded Checkout, and nothing has added it since (`BUSINESS_RULES.md`: "nothing sets `plan` to `pro` yet"). Raised to the user before writing any code, since this phase's own instructions both said "keep Stripe integration unchanged" and "unless required by the UI" - a real tension given every "Upgrade"/"Manage subscription" CTA needs to do *something*. The user confirmed: UI-only this phase. Every such CTA (`UpgradeButton`, `ManageSubscriptionButton`) is fully styled and wired into the app, but shows an informational toast ("Upgrading isn't available yet…") instead of a real Stripe redirect. No new environment variables, no new Stripe API calls beyond the existing webhook-verification ones.

### Added

- `src/shared/components/ui/badge.tsx`, `progress.tsx` - two new generic primitives (Base UI's `@base-ui/react/progress` wrapped in this project's existing shadcn-style pattern; `Badge` is presentational only, no Base UI equivalent needed). Neither existed before this phase and both are reused across every new component below - not billing-specific, so they live in `shared/components/ui`, not `features/billing`.
- `BillingService.getApplicationUsage(userId)` - a read-only sibling of `requireApplicationCapacity`, reusing the exact same `ApplicationRepository.countByStatuses` call and `FREE_PLAN_APPLICATION_LIMIT` constant, so the number displayed to the user and the number enforced on create can never drift apart. Returns `{ used, limit }`, with `limit: null` for Pro (unlimited).
- `billing.constants.ts` gained `USAGE_WARNING_RATIO` (0.8, display-only - not an entitlement threshold), `PLAN_FEATURE_ROWS` (the Pricing page's comparison-table data - the single source for both plan cards and the table, so the copy is never written twice), and `PRO_BENEFITS` (the shared "why upgrade" bullet list reused by every dialog).
- `src/features/billing/utils/usage-status.ts` - `getUsageStatus(used, limit)`, a pure function extracted specifically so the Usage Indicator's "ok"/"approaching-limit"/"at-limit" thresholds are unit-testable without rendering anything (this test suite has no component-rendering setup - see Testing below).
- `src/features/billing/components/`: `UpgradeButton`, `ManageSubscriptionButton` (the two placeholder CTAs described above); `UsageIndicator` (progress bar + the two threshold messages, Free-plan only); `UpgradeDialog` (shown when a Pro-gated action is denied - currently only Export); `LimitReachedDialog` (shown when application creation is denied by the Free-plan limit); `SubscriptionSection` (Settings' new "Subscription" card: plan, status, renewal date, billing period (shows "—" - the schema has no interval/billing-period column to read, so none was invented), Usage Indicator, and the Upgrade/Manage button); `PricingPlans` (the Pricing page's plan cards + comparison table, both sourced from `PLAN_FEATURE_ROWS`).
- `app/(dashboard)/pricing/page.tsx` (new route, `ROUTES.PRICING`) - composes `BillingService.getSubscriptionForUser` and `PricingPlans` only.
- "Pricing" added to `NAV_ITEMS` (`config/navigation.ts`), with a Free-plan-only "Pro" upsell badge. The badge is threaded as a plain `showProBadge` boolean prop through `MainLayout` → `Sidebar`/`TopNav` → `SidebarNav`/`MobileSidebar` - the same slot-injection pattern already used for `search`/`exportMenu` (Phase 19), so `SidebarNav` still takes no dependency on the Billing feature. Computed once in `(dashboard)/layout.tsx` via `BillingService.getSubscriptionForUser`, defaulting to hidden on any lookup failure.

### Changed

- `ExportMenu.tsx` - a `FORBIDDEN` result (Export requires Pro) now opens `UpgradeDialog` instead of a plain toast. Any other error code still shows a toast, unchanged. No change to `ExportService`/`BillingService.requireProPlan`.
- `ApplicationForm.tsx` - a `FORBIDDEN` result on *create only* (the Free-plan limit) now opens `LimitReachedDialog` instead of a plain toast. Editing an existing application is unaffected (that path never hits this check). No change to `ApplicationService.create`/`BillingService.requireApplicationCapacity`.
- `app/(dashboard)/settings/page.tsx` - gained a "Subscription" card, fetching `BillingService.getSubscriptionForUser`/`getApplicationUsage` alongside the existing profile fetch (parallel, matching the page's existing `Promise.all` shape). Shows an inline error message if the subscription lookup fails, matching every other page's existing error-state convention - it does not crash the page.

### Not changed (by design)

- `BillingService.requireProPlan`, `requireApplicationCapacity`, `ApplicationService.create`, `ExportService`, the Stripe webhook, and the `subscriptions` table/RLS policies - untouched. Every new UI surface only *displays* or *reacts to* decisions these already make; none of them make a new decision.

### Documentation updated

- `API.md` - new "Subscription" section (`GET /subscription`, `GET /subscription/usage`) - both read-only, backing the new pages.
- `USER_GUIDE.md` - new "15. Plans & Billing" section (Free vs. Pro, the Pricing page, the Subscription section, the Usage Indicator's two thresholds, the Limit Reached screen); the "Managing Applications" and FAQ sections cross-reference it.

### Testing

- No component-rendering tests were added. This suite has no jsdom/React Testing Library setup (`vitest.config.ts` is Node-only, by deliberate Phase 17 choice, and only collects `*.test.ts`, not `.tsx`). Adding one would mean installing new dev dependencies and changing the test config - raised to the user before doing so; the user chose to keep testing at the existing Service/pure-function layer instead. Covered there: `billing.service.test.ts` (`getApplicationUsage`, 5 new tests), `usage-status.test.ts` (the Usage Indicator's threshold boundaries, 7 tests), `billing.constants.test.ts` (`PLAN_FEATURE_ROWS`/`PRO_BENEFITS` data integrity, 4 tests).
- `npm run typecheck`, `npm run lint`, `npm run test` (147 tests, 15 files - 2 new files, 16 new tests), and `npm run build` all pass, including the new `/pricing` route being correctly collected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4 (no reachable Supabase/test account here).

---

## Phase 32 — Smart Job Import (2026-07-23)

Added a Pro-only "Smart Job Import" feature: create an application by pasting a job posting URL. Ships with exactly one provider - a Manual Provider that always matches and extracts nothing, so the workflow lands the user on the same editable review form either way - built around a provider abstraction so LinkedIn/InfoJobs/Indeed/Greenhouse/Lever/Workday/Ashby can each be added later as a new provider, never a change to the Service, Actions, or UI. No scraping, no external APIs, no browser automation, no LLM integration, and no change to Stripe/entitlements/server-side validation beyond reusing what already exists.

### Architecture

- New feature `src/features/job-import/{types,providers,schemas,services,actions,components}`. `JobImportProvider` (`types/job-import.types.ts`) is the interface every provider implements: `supports(url)` and `extract(url)`. `ManualJobImportProvider` (`providers/manual.provider.ts`) is the only entry in `JOB_IMPORT_PROVIDERS` (`providers/job-import-providers.registry.ts`) - an ordered list, first match wins; future providers are added ahead of Manual (which must stay last, since its `supports` always returns true - the universal fallback).
- `selectJobImportProvider(url, providers)` (`providers/select-job-import-provider.ts`) - the provider-matching logic extracted as its own pure function, specifically so "first match wins" / "falls back to Manual" / "no provider matches" are unit-testable without mocking a Service.
- `JobImportService` (`services/job-import.service.ts`) owns provider selection, orchestration, and error handling - the only caller of `JOB_IMPORT_PROVIDERS`. `.extract(userId, url)`: Pro-gates via `BillingService.requireProPlan` (reused, not duplicated), selects a provider, calls `.extract()`, and translates any thrown error into a generic message ("never expose internal errors" - whatever a future provider's own extract() throws, e.g. a network failure, is never surfaced directly). `.confirmImport(userId, input)`: Pro-gates again (defense in depth - never assumes the client actually went through `.extract()` first), resolves the company name via `CompanyService.findOrCreateByName` (new), then creates the application through the exact same `ApplicationService.create` every other creation path uses - the Free plan's application-count limit and reference validation are not bypassed for imports.
- `CompanyService.findOrCreateByName(userId, name)` (`features/companies/services/company.service.ts`) - resolves a free-text company name to an existing company's id, creating one only if no active company with that name exists yet, so importing a job never requires the company to already exist. Reuses `create`'s own uniqueness handling entirely (no new Repository method): a 23505 conflict from a concurrent request is re-resolved to the winning row rather than surfaced as an error, since "find or create" should never fail just because the company already exists.
- `description` (one of the extraction fields) has no column on `applications` - it becomes the application's first Note instead (`ApplicationNoteService.create`, reused as-is). Best-effort: if attaching the note fails, the already-created application is still returned as a success, only logged.
- `applicationDateField`/`refineDateNotInFuture` (`application.schema.ts`) were exported (previously private) so `confirmJobImportSchema` reuses the exact same date validation `createApplicationSchema` already has, instead of duplicating it.

### UI

- `ImportJobButton` - "Import Job", placed next to "Create application" on the Applications page. Always visible/clickable regardless of plan; the Pro gate only triggers on the actual import attempt, the same "attempt the action, then react to FORBIDDEN" pattern `ExportMenu` already established (Phase 31.5) - not a second, duplicated client-side plan check.
- `ImportJobDialog` - the four-state workflow (Idle: URL input: Loading: spinner while detecting/extracting; Success: the review form; Failure: a friendly message with "Try again" and "Continue manually," the latter landing on the same review form, blank). A `FORBIDDEN` result at the Idle→Loading transition closes this dialog and opens the existing `UpgradeDialog` (Phase 31.5, reused unchanged with `featureName="Smart Job Import"`) - no second "why go Pro" dialog was built.
- `JobImportReviewForm` - every extracted field editable before creation, mirroring `ApplicationForm`'s own fields/options/patterns (same constants, same Select/NONE_VALUE pattern, same Controller usage) for consistency. Deliberately its own component rather than reusing `ApplicationForm`: `company` is free text here (resolved to an id at confirm time), not a Select of already-existing companies - a genuine shape difference, not duplication for its own sake.
- `billing.constants.ts`: `PLAN_FEATURE_ROWS`'s "Smart Job Import" row is no longer marked `comingSoon` (it's real now); `PRO_BENEFITS` updated to describe it as available rather than upcoming.

### Documentation updated

- `API.md` - new "Job Import" section (`POST /job-import/extract`, `POST /job-import/confirm`), both Pro-gated.
- `USER_GUIDE.md` - new "Smart Job Import (Pro)" subsection under "Managing Applications"; "Plans & Billing"'s Pro feature list and FAQ updated.

### Testing

- No component-rendering tests, per this suite's existing philosophy (see Phase 31.5's own note on this). Added: `select-job-import-provider.test.ts` (provider detection - ordering, fallback, no-match), `manual.provider.test.ts` (always supports, extracts nothing but the URL), `job-import.schema.test.ts` (URL/confirm-import validation, including salary ordering and future-date rejection), `job-import.service.test.ts` (Pro-gating on both `extract`/`confirmImport`, provider selection/failure handling, error-message sanitization, description → Note attachment and its best-effort failure), and new `CompanyService.findOrCreateByName` tests (found/created/race-condition/trim/genuine-failure paths) in the existing `company.service.test.ts`.
- `npm run typecheck`, `npm run lint`, `npm run test` (182 tests, 19 files - 4 new files, 35 new tests), and `npm run build` all pass, including the Applications page's new "Import Job" button being correctly collected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 33 — Advanced Analytics (2026-07-23)

Expanded Analytics into a second, Pro-only, filterable dashboard (`/analytics/advanced`) covering nine areas - Application Funnel, Company Performance, CV Performance, Timeline Analysis, Job Search Activity, Work Modality, Employment Type, Salary, and Personal Insights - without replacing or changing the existing (free, unfiltered) Analytics page in any way.

### Reuse over rebuilding

Most of the nine sections needed no new calculation at all:

- **Application Funnel** reuses `computeFunnelAnalytics` (Phase 12) unchanged.
- **CV Performance**, **Work Modality**, and **Employment Type** reuse `computeGroupAnalytics`/`computeWorkModeAnalytics`/`computeEmploymentTypeAnalytics` (Phases 12/29) unchanged - just fed a filtered subset of applications.
- **Personal Insights**' CV-related observation already existed (`computeInsights`, Phase 12/21) and was left untouched; only two genuinely new insights were added (see below).
- UI-wise, `FunnelChart`, `InsightsList`, `AnalyticsComparisonTable`, `WorkModeAnalyticsTable`, and `EmploymentTypeAnalyticsTable` (Phases 12/29) are reused verbatim - not one new chart primitive was built where an existing component already fit.

What's genuinely new: **Company ranking** (top/worst by interview rate), **Timeline Analysis**, **Job Search Activity** (streaks), **Salary**, and two new **Personal Insights** (work modality comparison, day-of-week comparison) - plus the **filtering** mechanism all nine sections share.

### Why this path doesn't use the Phase 21 statistics views

`dashboard_metrics`/`company_statistics`/`cv_statistics`/`monthly_statistics` have no filter parameters - a `WHERE company_id = ...` inside a SQL view isn't something PostgREST exposes. Since every section here must respect the same filters uniformly, `AnalyticsService.getAdvancedSummary` computes Company/CV/Monthly groupings via `computeGroupAnalytics` (the same bulk-fetch path Source Analytics already established) fed a filtered subset of `ApplicationService.listAllForAnalytics`'s existing bulk read - no new Repository method, no new query, and the base Analytics page's own view-based path is completely untouched.

### Architecture

- `AnalyticsRepository`/`ApplicationRepository.listAllForAnalytics`'s projection gained `salary_min`, `salary_max`, `currency` (additive - no migration, the columns already exist on `applications`) - needed for the Salary section.
- `ApplicationHistoryFacts` (analytics-calculations.ts) gained `recruiterContactEnteredAt`/`firstInterviewEnteredAt`, populated in `buildHistoryFactsByApplication` the same way `offerEnteredAt`/`acceptedEnteredAt` already were - needed for Timeline Analysis's stage-to-stage averages. `INTERVIEW_STAGE_ONLY_STATUSES` (application.constants.ts) is a new, narrower sibling of `INTERVIEW_STAGE_STATUSES` (HR/Technical/Final Interview only, excluding Offer/Accepted) - "first interview stage reached" needed a name distinct from "reached at least an interview" (the existing Interviews KPI's own definition).
- `computeAverageDaysBetween` (private, Phase 29) was generalized into an exported `computeAverageDaysBetweenEvents(apps, historyFacts, fromAtOf, toAtOf)` - the existing function became a thin wrapper fixing `fromAtOf` to `application_date`. No behavior change to any existing caller (Average Response/Offer/Hiring Time); Timeline Analysis's four stage-to-stage steps are the only new caller, reusing the exact same day-counting/rounding logic instead of a parallel implementation. `daysBetween`/`roundTo`/`toRate` were also exported for the same reason.
- New `src/features/analytics/utils/advanced-analytics-calculations.ts` (pure, no I/O - mirrors analytics-calculations.ts's own split from the Service): `filterApplicationsForAdvancedAnalytics` (in-memory, applied once before any section computes); `rankCompanies` (top/worst by interview rate, gated by the existing `MIN_SAMPLE_COMPANY_COMPARISON`, plus the account-wide average response time); `computeTimelineAnalysis` (four stage-to-stage steps + fastest/slowest/median full-process duration, Application Date → Accepted); `computeActivityAnalysis` (streaks over distinct calendar days - "current" only counts if the most recent applied day is today or yesterday - plus most/least active month, reusing the already-computed monthly grouping rather than re-deriving it, and a recent-weeks ISO-week breakdown); `computeSalaryStatistics`/`computeSalaryDistribution`/`computeSalaryByCompany`/`computeSalaryByWorkMode` (every application's salary value is the midpoint of `salary_min`/`salary_max`, or whichever bound is present - applications with neither are excluded, never treated as zero); `computeAdvancedInsights` (work-modality and day-of-week comparisons, each gated by `MIN_SAMPLE_INTERVIEW_OFFER_RATE`, the same threshold the base page's own undocumented-comparison insights already reuse).
- **Known simplification (documented, not silently assumed):** salary figures are aggregated as plain numbers regardless of each application's own `currency` - there is no currency-conversion capability in this application (no forex API, and this phase forbids external APIs). An account recording salaries in more than one currency will see a mixed aggregate.
- **Deliberately not built:** a "most offers come from medium-sized companies" insight. `companies.size` is free text (DATABASE.md), not a structured enum - bucketing it into "small/medium/large" would mean inventing categorisation boundaries the data doesn't define, exactly the fabrication "SECTION 9" itself forbids.
- `AnalyticsService.getAdvancedSummary(userId, filters)` - Pro-gated via `BillingService.requireProPlan`, the same check Export/Smart Job Import already use ("do not duplicate Pro gating logic").
- `src/features/analytics/schemas/advanced-analytics.schema.ts` (new `schemas/` folder for this feature) - `advancedAnalyticsFiltersSchema` sanitizes the page's searchParams, falling back to "no filter" instead of erroring, the same convention `listApplicationsSchema` already uses.

### UI

- `app/(dashboard)/analytics/advanced/page.tsx` (new route, `ROUTES.ANALYTICS_ADVANCED`) - a separate page, linked from a new "Advanced Analytics" button on the existing Analytics page (which is otherwise unchanged). A `FORBIDDEN` result renders `AdvancedAnalyticsGate` (new) - the existing `UpgradeDialog` (Phase 31.5), open by default, so a Free user sees the same gate whether they arrived via the link or navigated to the URL directly.
- `AdvancedAnalyticsFilterBar` (new) - mirrors `ApplicationFilterBar`'s URL-searchParams-driven pattern (BUSINESS_RULES.md "Filtering": "must be combinable"), scoped to the six requested filters.
- New presentational components for the genuinely new sections: `CompanyRankingList`, `TimelineAnalysisSection`, `JobSearchActivitySection` (a CSS-width-bar recent-weeks chart, matching `FunnelChart`'s own hand-rolled style - no chart dependency was installed), `SalarySection` (same CSS-bar distribution chart). Every other section reuses an existing component unchanged (see "Reuse over rebuilding" above).
- `billing.constants.ts`: `PLAN_FEATURE_ROWS`'s "Advanced Analytics" row is no longer marked `comingSoon`; `PRO_BENEFITS` updated to describe it as available.

### Documentation updated

- `API.md` - new "Advanced Analytics" subsection under "Analytics" (`GET /analytics/advanced`, filter parameters, response contents).
- `USER_GUIDE.md` - new "Advanced Analytics (Pro)" subsection under "Analytics" (section-by-section table); "Plans & Billing" and FAQ updated.

### Testing

- No component-rendering tests, per this suite's existing philosophy. Added: `advanced-analytics-calculations.test.ts` (filtering - every filter and combinations; company ranking incl. minimum-sample gating; timeline stage-to-stage averages and process durations; activity streaks incl. the "current vs. stale" boundary and most/least active month; salary statistics/distribution/by-company/by-work-mode incl. missing-data handling; both new insights incl. their gating); `analytics.service.test.ts` (new - `getAdvancedSummary`'s Pro gate and filter-then-compute wiring; `getSummary` remains covered only through analytics-calculations.test.ts's pure-function tests, per this codebase's existing convention); `advanced-analytics.schema.test.ts` (filter validation/fallback behavior); plus two new regression tests in `billing.constants.test.ts` guarding that Advanced Analytics is no longer marked "Coming Soon".
- `npm run typecheck`, `npm run lint`, `npm run test` (221 tests, 22 files - 3 new files, 39 new tests), and `npm run build` all pass, including the new `/analytics/advanced` route being correctly collected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 34 — Calendar & Timeline (2026-07-23)

Added a complete, Pro-only Calendar module (`/calendar`, in the main navigation) visualizing every important job-search event - Month/Week/Agenda views, 10 event types, an Event Details side panel reusing the existing Status History timeline and Interview Feedback, user-created Reminders/Custom Events, filters, and search - without duplicating any of the Status History/Interview Feedback business logic it builds on.

### Data model

- New table `calendar_events` (migration `20260723090000_calendar_events.sql`) - only the two user-created event types (`reminder`, `custom`) are ever stored as rows; the other 9 event types are derived on the fly from `application_status_history` and never persisted twice. Hybrid ownership shape identical to `interview_feedback` (Phase 30): its own `user_id` column for direct filtering, plus an RLS check that an optional `application_id` (nullable - a Reminder/Custom Event need not be tied to an application) belongs to the user when set. Soft-deletes only (`deleted_at`) - no DELETE grant, matching every other business entity.
- `AnalyticsApplicationRow`/`ApplicationRepository.listAllForAnalytics` gained `position` (additive, column already exists on `applications`) - the Calendar and its search need the position, which no earlier consumer of this shared, evolving projection did (Phase 33 added the salary fields the same way).
- `InterviewFeedbackRepository.listAllForUser`/`InterviewFeedbackService.listAllForUser` (new) - the same "whole account, one bulk read" shape `ApplicationNoteRepository.listAllForUser` already established for Export (Phase 14), now reused so the Calendar's Event Details panel can show Interview Feedback inline with zero extra queries per event.

### Architecture

- New feature `src/features/calendar/{types,constants,repositories,utils,services,schemas,actions,components}`. `utils/calendar-calculations.ts` (pure, no I/O - mirrors every other feature's Service/calculations split): `deriveStatusHistoryEvents` maps each real status-history transition to a `CalendarEventType` (only `Applied`/`Recruiter Contact`/`HR Interview`/`Technical Interview`/`Final Interview`/`Offer`/`Accepted`/`Rejected` produce an event; the `Wishlist` genesis row produces none); `mapCustomEventToCalendarEvent` maps a stored row to the same unified shape; `buildCalendarEvents` merges and sorts both by date; `filterCalendarEvents`/`searchCalendarEvents` (search matches company name, position, or note content, via a notes index built once from the bulk notes read - applied after filters, never independently widening what filters already excluded); `buildMonthGrid`/`buildWeekGrid` (Monday-start, 42-cell/7-cell grids).
- **A rejection is never silently dropped.** Only a rejection whose previous status was `Offer` maps to the task's literal "Offer Rejected" type; a rejection from any earlier stage maps to a new, generic `rejected` type instead of being discarded - hiding it would contradict a calendar whose whole purpose is to show every important event.
- `CalendarService.getEvents(userId, filters, search)` - Pro-gated via `BillingService.requireProPlan` (reused, not duplicated - the same check Export/Smart Job Import/Advanced Analytics already use), then bulk-fetches applications, custom events, notes, and feedback in parallel (`Promise.all`), derives/merges/filters/searches events, and returns everything the Event Details panel needs (`history`/`notes`/`feedback`, as flat arrays) in one response - opening any event's details afterward costs zero additional queries. `createCustomEvent`/`updateCustomEvent`/`archiveCustomEvent` each independently re-check the Pro gate and, when an `applicationId` is given, verify it through `ApplicationService.getById` (never `ApplicationRepository` directly, the same cross-feature-Service discipline every other feature already follows).
- `EventDetailsPanel` reuses `ApplicationStatusTimeline` (Phase 9) wholesale, including its `renderFeedback` slot (Phase 30) rendering `InterviewFeedbackPanel` - one existing component satisfies both the "Timeline" and "Interview Feedback (if any)" requirements, with no parallel timeline renderer built.
- New shared primitive `src/shared/components/ui/tooltip.tsx` (Base UI's already-installed `@base-ui/react/tooltip`, no new dependency) - each event type's icon shows its label on hover.

### UI

- `app/(dashboard)/calendar/page.tsx` (new route, `ROUTES.CALENDAR`, a sidebar nav item unlike Advanced Analytics) - a `FORBIDDEN` result renders `CalendarGate` (mirrors `AdvancedAnalyticsGate`), the existing `UpgradeDialog` open by default - "do not create a new Pro gating system."
- `CalendarBoard` renders Month (default) or Week or Agenda based on the `view` URL param; when unset, it renders both Agenda (`block sm:hidden`) and Month (`hidden sm:block`) simultaneously, letting Tailwind's breakpoint alone decide which one is visible - satisfying "Month View is the default" on desktop and "Agenda View becomes the default" on mobile with no device detection.
- `CalendarFilterBar`/`CalendarViewSwitcher` - URL-searchParams-driven, mirroring `ApplicationFilterBar`/`AdvancedAnalyticsFilterBar`'s existing pattern.
- `CustomEventFormDialog`/`CustomEventForm` - create and edit a Reminder or Custom Event (Type, Title, Date, optional Application, optional Description); the Applications picker is derived from the already-loaded events list (no extra query).
- `billing.constants.ts`: `PLAN_FEATURE_ROWS`'s "Calendar" row is no longer marked `comingSoon` (it's real now); "Reminders" stays `comingSoon` - this phase built a Reminder *event type*, not proactive notification/alert delivery, and the two are not the same claim. `PRO_BENEFITS` updated accordingly.

### Documentation updated

- `API.md` - new "Calendar" section (`GET /calendar` with its filters, `POST /calendar/events`, `PATCH /calendar/events/:id`, `POST /calendar/events/:id/archive`), all Pro-gated.
- `USER_GUIDE.md` - new "Calendar (Pro)" section (views, event types, event details, creating Reminders/Custom Events, filters/search); Table of Contents and every subsequent section renumbered; "Plans & Billing" and FAQ updated, including a FAQ entry clarifying that a Reminder does not yet send any notification.
- `DATABASE.md` - new `calendar_events` table documented alongside `interview_feedback`.

### Testing

- No component-rendering tests, per this suite's existing philosophy. Added: `calendar-calculations.test.ts` (event-type mapping for every documented status transition including both rejection paths, the Wishlist skip, custom-event mapping with/without a linked application, merge+sort, every filter individually and combined, notes-indexed search, date grouping, and both grid builders); `calendar.service.test.ts` (the Pro gate on every method, bulk-fetch orchestration, filter-then-search ordering, applicationId ownership verification on create, and not-found handling on update/archive); `calendar.schema.test.ts` (filter fallback-to-undefined behavior, the type restricted to `reminder`/`custom`, and required-field validation); three new tests for `InterviewFeedbackService.listAllForUser` in the existing `interview-feedback.service.test.ts`; and two new regression tests in `billing.constants.test.ts` guarding that Calendar is no longer "Coming Soon" while Reminders still is.
- `npm run typecheck`, `npm run lint`, `npm run test` (274 tests, 25 files - 3 new files, 53 new tests), and `npm run build` all pass, including the new `/calendar` route being correctly collected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 35 — Goals, Achievements & Progress (2026-07-23)

Added a complete, Pro-only Goals module (`/goals`, in the main navigation): configurable goals (Applications/Interviews/Offers/Recruiter Contacts x Weekly/Monthly/Quarterly/Yearly/Total) with live-computed progress, three streak types, an automatically-unlocking achievement system, account-wide statistics, a compact Dashboard widget, and goal-deadline events inside Calendar - without duplicating a single metric Analytics/Advanced Analytics/Calendar already compute.

### Phase numbering note

This session's instructions labeled this "Phase 35," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 35 ("Supabase Storage Configuration," unimplemented, a prerequisite for its Phase 36 CV file attachment). Recorded under this label only to match the session's own request, per the same practice established at Phase 31/34 - it does not claim or displace the document's actual Phase 35.

### Reuse over rebuilding

Every one of a goal's four metrics maps directly onto data Analytics already computes, not a new calculation:

- **Applications** reads `application_date` directly off the same bulk `AnalyticsApplicationRow` projection Analytics/Advanced Analytics/Calendar already fetch.
- **Interviews**, **Offers**, and **Recruiter Contacts** read `firstInterviewEnteredAt`/`offerEnteredAt`/`recruiterContactEnteredAt` straight off `ApplicationHistoryFacts` (Phase 29/33's own per-application status-history facts) - a goal's "current value" for a period is just a count of applications whose fact timestamp falls inside that period's window.
- The **daily streak** (current/longest) is `computeActivityAnalysis`'s own existing output (Phase 33), passed through unchanged - never recomputed. Only the **weekly** and **monthly** streaks are genuinely new, sharing one generic "consecutive unit" algorithm between them.
- Achievement predicates (First Interview/Offer/Accepted Offer, Interview Master, Offer Hunter) are thin checks over the same `ApplicationHistoryFacts`, deliberately checking the *history* fact rather than `current_status` - an application later rejected after interviewing still counts toward "reached an interview," which `current_status` alone would hide.

### Architecture

- New tables `goals` and `user_achievements` (migration `20260723100000_goals.sql`). `goals` never stores progress - only the goal's own definition (`metric`, `period`, `target_value`, optional `title`) and its `status` (`active`/`paused`/`archived`); `completed_at` is set at most once, and only for `period = 'total'` goals (recurring goals reset forever and have no single "completion" to record). `user_achievements` is a permanent, append-only unlock log (`unique(user_id, achievement_key)`) - the achievement catalog itself (label/description/unlock condition) lives entirely in code (`goal.constants.ts`/`achievement-calculations.ts`), not the database, so adding a new achievement later needs no migration.
- New feature `src/features/goals/{types,constants,repositories,utils,services,schemas,actions,components}`. `utils/goal-calculations.ts` (pure, no I/O): `getPeriodWindow` maps a goal's period to a `[start, end]` date window over "today" (`end: null` for `total,` which never resets); `countMetricInWindow` counts matching applications inside that window; `computeGoalProgress` assembles current/target/remaining/percentage/estimated-completion-date/period bounds; `computeEstimatedCompletionDate` extrapolates a completion date from the goal's pace so far (progress-so-far ÷ days elapsed), returning `null` (not a fabricated date) whenever there's no progress yet to extrapolate from - the same "honest 'not enough data'" precedent Advanced Analytics already established; `computeWeeklyStreak`/`computeMonthlyStreak` generalize the day-streak's own "consecutive run" shape to Monday-start weeks and calendar months; `computeGoalStatistics`/`buildDashboardGoalsWidgetData`/`buildGoalDeadlineEvents` are pure projections, not new calculations.
- **Documented simplification:** "average completion time" (a Statistics figure) only ever averages `period = 'total'` goals' `completed_at - created_at`. A recurring goal's periods reset forever, so it has no single honest "time to completion" a plain average could represent - averaging it anyway would fabricate precision the data doesn't support, the same reasoning Advanced Analytics' own currency-conversion/company-size notes already established.
- `GoalService` (`services/goal.service.ts`) - Pro-gated via `BillingService.requireProPlan` on every entry point (reused, not duplicated - the same check Export/Smart Job Import/Advanced Analytics/Calendar already use), sharing one internal `loadContext` bulk-fetch (applications, status history, this user's goals) across `getGoalsPageData`/`getDashboardWidgetData` so the dashboard widget never re-fetches applications a second time. Lazily persists a `total` goal's `completed_at` the first time its progress is detected as complete (best-effort - a failed write never blocks the page). `listGoalsWithProgressForCalendar` (used only by `CalendarService`) deliberately does **not** re-check the Pro plan, mirroring `InterviewFeedbackService.listAllForUser`'s own precedent: the caller's own single Pro-gated entry point already covers the whole read.
- `AchievementService` (`services/achievement.service.ts`) - "Achievements unlock automatically": since this application has no background job/cron, "automatic" means evaluated and persisted lazily on the next read (the same lazy-detect-and-persist shape `CompanyService.findOrCreateByName`, Phase 32, already established for a different table). A concurrent double-unlock race (23505 unique violation) is treated as "already unlocked," not an error - and, unlike a first draft of this logic, is still included in the returned unlocked set (an unlock that lost the race is still a real, true unlock).
- **Calendar integration:** `CalendarEventType` gained an 11th value, `goal_deadline` (never stored - derived the same way every status-derived event already is), and `CalendarEvent` gained an optional `goalCompleted` flag. `CalendarService.getEvents` now also fetches `GoalService.listGoalsWithProgressForCalendar` and merges one deadline event per active, recurring goal (at its current period's end date) into the same event list every filter/search/sort already operates on - not a parallel path. "Completed goals should appear visually": `CalendarEventIcon` gained a `completed` prop that overrides the dot color to emerald and the icon to a checkmark, independent of the underlying event type.
- **Dashboard integration:** `GoalService.getDashboardWidgetData` reuses the exact same bulk computation as the Goals page itself, reshaped into a compact projection (today's application count, active weekly goals, recently unlocked achievements, upcoming deadlines) - never a second calculation.

### UI

- `app/(dashboard)/goals/page.tsx` (new route, `ROUTES.GOALS`, a sidebar nav item) - a `FORBIDDEN` result renders `GoalsGate` (mirrors `CalendarGate`/`AdvancedAnalyticsGate`), the existing `UpgradeDialog` open by default - "do not create a new entitlement system."
- `GoalsBoard` groups goals into Active/Paused/Archived sections, each with its own empty state; the page-level empty state ("No active goals." / "Create your first goal.") only shows when the user has no goals at all.
- `GoalCard` shows the progress bar/current/target/remaining/percentage/estimated-completion-date, and an actions menu (Edit, Pause ↔ Reactivate, Archive, Delete) - Delete is confirmed via the existing `ConfirmDialog` (mirrors `ApplicationDetailActions`'s own Archive confirmation), and is a genuinely different operation from Archive (a visible `status`, not a removal).
- `StreakSummaryCard`/`AchievementsGrid`/`GoalStatisticsCards` render the already-computed streak summary/achievement states/statistics directly - no client-side recalculation.
- `GoalsDashboardWidget` - a `FORBIDDEN` result renders a compact teaser (an "Upgrade" button opening the existing `UpgradeDialog` only on click, never automatically) instead of the full `GoalsGate`, the same "attempt the action, react to FORBIDDEN" pattern `ExportMenu` established for a passive dashboard surface rather than a click-triggered one.
- `billing.constants.ts`: `PLAN_FEATURE_ROWS`'s "Goals" row is no longer marked `comingSoon` (it's real now, following the same precedent Calendar's own flip set in Phase 34); "Reminders" remains the only `comingSoon` row. `PRO_BENEFITS` updated accordingly.

### Documentation updated

- `API.md` - new "Goals" section (`GET /goals`, `POST /goals`, `PATCH /goals/:id`, pause/reactivate/archive, delete), all Pro-gated; a new "Dashboard Goals Widget" subsection under "Dashboard" noting its independent Pro gate.
- `USER_GUIDE.md` - new "Goals, Achievements & Progress (Pro)" section (setting a goal, tracking progress, managing goals, streaks, achievements, statistics, the Dashboard widget, the Calendar integration); Table of Contents and every subsequent section renumbered; "Plans & Billing" and FAQ updated, including FAQ entries on period resets, achievement permanence, and the not-yet-built Custom goal type.
- `DATABASE.md` - new `goals` and `user_achievements` tables, and the `goal_metric`/`goal_period`/`goal_status` enums, documented alongside `calendar_events`.

### Testing

- No component-rendering tests, per this suite's existing philosophy. Added: `goal-calculations.test.ts` (period windows for all five periods, metric-window counting for all four metrics, estimated-completion-date extrapolation and its "not enough data" cases, full progress computation, display-title fallback, weekly/monthly streak counting including a year rollover and a broken-streak case, statistics scoped correctly to `total` goals only, goal-deadline event building including the `goalCompleted` flag, and the dashboard widget projection); `achievement-calculations.test.ts` (every achievement predicate, including that interview/offer achievements read history facts rather than `current_status`); `achievement.service.test.ts` (the unlocked-read failure path, skipping already-unlocked achievements, persisting newly-earned ones, the unique-violation race still counting as unlocked, and a best-effort non-conflict failure not blocking the rest); `goal.service.test.ts` (the Pro gate on every method, the shared bulk-fetch context, lazy `total`-goal completion persistence including the "don't re-persist" case, that the Calendar-facing method skips the Pro re-check, and goal CRUD including title-trimming and not-found handling); `goal.schema.test.ts` (metric/period restriction, target coercion/positivity/integer validation); and new tests added to `calendar.service.test.ts` for the goal-deadline merge and its error propagation.
- `npm run typecheck`, `npm run lint`, `npm run test` (355 tests, 30 files - 5 new files, 80 new tests), and `npm run build` all pass, including the new `/goals` route being correctly collected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 36 — Notification Center & Smart Reminders (2026-07-24)

Added a centralized, Pro-only Notification Center (`/notifications`, reached via a new bell icon in the top navigation with a live unread-count badge) that proactively surfaces stale applications, upcoming interviews, goal progress, achievement unlocks, and calendar events - replacing what would otherwise be a simple, standalone reminder system with one that reuses every relevant piece of existing infrastructure instead of re-implementing any of it.

### Phase numbering note

This session's instructions labeled this "Phase 36," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 36 ("CV/Resume File Attachment," unimplemented, depending on its own Phase 35 "Supabase Storage Configuration"). Recorded under this label only to match the session's own request, per the same practice established at Phase 31/34/35 - it does not claim or displace the document's actual Phase 36.

### Architecture: nothing about a notification is stored except its state

Every notification is generated live, on every read, from data this application already computes elsewhere - never a second, parallel calculation, and never a queue of accumulating "notification" rows:

- **Application** (becoming stale / no activity for N days / follow-up recommended - one continuous severity ladder, only the highest tier reached fires) reads the `application_submitted` Calendar event every applied-to application already has (company/position/status), cross-referenced with the bulk status-history read for "most recent change of any kind" - a genuinely new, small calculation (`buildLastChangeDateByApplication`), since `ApplicationHistoryFacts` (Phase 29/33) only tracks specific *named* stage timestamps, not "last change regardless of stage."
- **Interview** (today/tomorrow) and **Calendar** (today's events/upcoming events, everything else within a week) both read directly off `CalendarService.getEvents`' own already-merged event list (derived status-history events + custom events + goal-deadline events) - "Interview in one hour" is deliberately not built: `event_date` is a date, not a timestamp, so there is no honest time-of-day data to base it on.
- **Goal** (weekly goal completed / behind schedule / deadline approaching / close to target) reads each goal's already-computed `GoalProgress` (`GoalService.getGoalsPageData`) wholesale - no metric is recalculated; "close to target" reuses the exact 0.8 ratio Phase 31.5's Usage Indicator warning already established rather than inventing a second threshold.
- **Achievement** (achievement unlocked) reads the same `AchievementState[]` `GoalService.getGoalsPageData` already returns (which itself calls `AchievementService.evaluateAndUnlock`) - one permanent notification per unlocked achievement, since an achievement never re-unlocks.
- **General** (welcome, tips) is the only category reading anything outside Calendar/Goals - `auth.users.created_at` (already returned by `AuthService.getCurrentUser()`, no new query) gates a time-boxed welcome message; a "set a goal" tip fires only when the user's own `goalsWithProgress` list (already fetched) is empty.
- New table `notification_states` (migration `20260724090000_notification_states.sql`) holds only a deterministic `notification_key` (e.g. `application:no_activity:<application_id>`, `achievement:unlocked:<key>`) and its `status` (`unread`/`read`/`archived`) - regenerating the full notification list on every page load always reattaches the same state to the same logical notification, and nothing about a notification's actual content is ever persisted or can go stale in the database.
- `NotificationService` - Pro-gated via `BillingService.requireProPlan` (reused, not duplicated); its only two dependencies are `CalendarService.getEvents` and `GoalService.getGoalsPageData` (plus the new state-only Repository) - "no duplicated scheduling logic," "reuse GoalService," "reuse AchievementService" are satisfied by depending on those Services wholesale rather than re-deriving anything they already compute.
- **Documented performance tradeoff:** every read re-runs the full generation (both dependencies' own bulk fetches), since notification content is never cached. This mirrors the same per-page-load cost every other Pro-gated feature already accepts (Calendar/Goals/Advanced Analytics each independently bulk-fetch on their own page load) - the nav bell's badge count is the one place this cost now runs on *every* dashboard page, mitigated by `BillingService.requireProPlan` short-circuiting immediately for Free plan users before any bulk fetch happens. A future phase could add caching if this proves too slow in practice.
- **Bug caught during its own test-writing, fixed before merge:** `AchievementService.evaluateAndUnlock`'s handling of a concurrent unlock race (23505 unique violation) originally dropped that achievement from its returned set entirely, even though the conflict itself proves it's genuinely unlocked - fixed to still include it (with an approximated timestamp, since the winning row's own `unlocked_at` isn't returned by the losing insert).

### UI

- `app/(dashboard)/notifications/page.tsx` (new route, `ROUTES.NOTIFICATIONS`, reached via the nav bell rather than a sidebar item, mirroring Search's own precedent) - a `FORBIDDEN` result renders `NotificationsGate` (mirrors `GoalsGate`/`CalendarGate`), the existing `UpgradeDialog` open by default.
- `NotificationBell` (new, in `TopNav` via a new `notificationBell` slot on `MainLayout`/`TopNav`, the same prop-injection pattern `search`/`exportMenu` already established) - always visible regardless of plan, with a badge only when the (Pro-gated) unread count succeeds.
- `NotificationsList` groups by Today/Yesterday/This Week/Older (each omitted when empty); `NotificationCard` shows icon/title/description/timestamp/read-unread state/optional action button, plus per-notification Mark as read/Archive/Delete; `NotificationHeaderActions` adds the bulk Mark all as read/Delete all read actions.
- `NotificationFilterBar` - URL-searchParams-driven, mirroring `CalendarFilterBar`/`AdvancedAnalyticsFilterBar`'s existing pattern (unread-only, category, company, date range, search); `applicationId` is supported by the underlying schema/filter function but has no dedicated picker in this filter bar, since no existing filter bar in this codebase surfaces a raw "pick one application" control either.
- `NotificationsDashboardWidget` - a `FORBIDDEN` result renders a compact teaser (an "Upgrade" button opening the existing `UpgradeDialog` only on click) instead of the full gate, the same pattern `GoalsDashboardWidget` already established for a passive dashboard surface.
- `billing.constants.ts`: `PLAN_FEATURE_ROWS`'s "Reminders" row (previously `comingSoon`, since Phase 34 only ever built a Reminder *event type*, not delivery) is no longer marked `comingSoon` - this phase is what actually delivers it; a new "Notification Center" row names the feature itself. `PRO_BENEFITS` updated accordingly.

### Documentation updated

- `API.md` - new "Notifications" section (`GET /notifications` with its filters, mark-read/mark-all-read/archive/delete/delete-all-read), all Pro-gated; a new "Dashboard Notifications Widget" subsection under "Dashboard."
- `USER_GUIDE.md` - new "Notification Center & Smart Reminders" section (where notifications come from, grouping, managing, filtering/search, the Dashboard widget); Table of Contents and every subsequent section renumbered; "Plans & Billing" and FAQ updated, including a revised FAQ entry on Calendar Reminders now correctly describing this phase's notification surfacing.
- `DATABASE.md` - new `notification_states` table and `notification_status` enum, documented alongside `user_achievements`.

### Testing

- No component-rendering tests, per this suite's existing philosophy. Added: `notification-calculations.test.ts` (every category's generation logic - all three application severity tiers and their exclusivity, terminal-status exclusion, interview today/tomorrow matching, calendar-category exclusion of already-covered event types, all four goal notification tiers and their priority ordering, achievement notification keying, welcome/tip gating, the full merge/sort in `buildNotifications`, state merging, every filter individually, and recency grouping including archived exclusion and the today/yesterday/this-week/older boundaries in both time directions); `notification.service.test.ts` (the Pro gate on every method, that `getNotifications` reuses `CalendarService`/`GoalService` wholesale with no independent Application/Status History fetch, error propagation from both dependencies, state-merge correctness for `unreadCount`, and mark-all-as-read/delete-all-read correctly scoping to exactly the currently-unread/read keys); `notification.schema.test.ts` (filter fallback-to-default behavior, key non-emptiness validation).
- `npm run typecheck`, `npm run lint`, `npm run test` (416 tests, 33 files - 3 new files, 61 new tests), and `npm run build` all pass, including the new `/notifications` route being correctly collected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 37 — Landing Page & Marketing Website (2026-07-24)

Added a complete, public-facing marketing site (Home, Features, Pricing, About, Contact, Privacy, Terms) with full SEO (metadata, OpenGraph, Twitter Cards, canonical URLs, robots.txt, sitemap.xml, JSON-LD) - entirely additive, with zero changes to any dashboard feature, Service, or Repository.

### Phase numbering note

This session's instructions labeled this "Phase 37," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 37 ("Tags / Skills + Skill Analytics," unimplemented). Recorded under this label only to match the session's own request, per the same practice established at Phase 31/34/35/36 - it does not claim or displace the document's actual Phase 37.

### Route conflict: why the pricing page is at /plans, not /pricing

The dashboard already owns `/pricing` (`(dashboard)/pricing/page.tsx`, Phase 31.5) - a logged-in-only page (its wrapping `(dashboard)/layout.tsx` redirects any signed-out visitor to `/login` before the page itself ever runs). Next.js cannot resolve two different `page.tsx` files to the same path, and this task's own scope ("does NOT modify the dashboard application") explicitly excludes touching that route or its layout. Asked directly, the user chose to leave `(dashboard)/pricing` completely untouched and serve the new public pricing page at `/plans` instead - a real, load-bearing route naming decision, not an incidental one.

### Architecture

- New `(marketing)` route group (`src/app/(marketing)/{layout,page,features,plans,about,contact,privacy,terms}`) - entirely separate from `(auth)`/`(dashboard)`, neither of which this phase touches. `(marketing)/layout.tsx` has no auth check at all (unlike `(dashboard)/layout.tsx`) - every page here is meant to be reachable by anonymous visitors.
- The previous root `src/app/page.tsx` (a pure "redirect to `/dashboard` or `/login`" stub - see its own comment: "no marketing Landing Page yet ... future work") is replaced by `(marketing)/page.tsx`, which keeps the one part of that stub still worth keeping - an already-signed-in visitor still lands on `/dashboard`, never marketing chrome - and renders the real homepage for everyone else.
- New feature `src/features/marketing/{constants,components,utils}` - purely presentational, no Service/Repository (there is no business logic to own; every fact it states - the Free plan's application limit, which features are Pro-only - is read from existing constants like `FREE_PLAN_APPLICATION_LIMIT`/`PLAN_FEATURE_ROWS`, never restated by hand).
- **"Reuse existing pricing components":** `/plans` renders `<PricingPlans isPro={false} />` (Phase 31.5) verbatim - no new pricing-comparison logic was written. Its "Upgrade to Pro" button is still that phase's own placeholder (no real Checkout exists yet), so the actual conversion path on this page is a "Sign up free" button underneath it.
- **"Dashboard screenshots" (Home hero):** `DashboardMockup.tsx` is an illustrative mockup built entirely from already-installed UI primitives (`Card`/`Progress`), not a literal screenshot - this environment has no way to capture a real one, and presenting a fabricated image as a genuine product screenshot would be dishonest. Same reasoning for the OpenGraph image (`(marketing)/opengraph-image.tsx`, rendered server-side via `next/og`'s `ImageResponse` from real JSX - a genuine generated image, not a fake asset).
- **"Testimonials placeholder":** `TESTIMONIAL_PLACEHOLDERS` uses generic role labels ("Job Seeker," "Career Changer") and explicitly-placeholder quote text - no fabricated names, companies, or photos presented as real endorsements. Meant to be replaced once real testimonials exist.
- **Contact page:** a direct `mailto:` link, not a contact form - this application has no email-sending infrastructure anywhere (no provider like Resend/SendGrid), and a form that silently goes nowhere would be worse than an honest, working email link. New `siteConfig.supportEmail`.
- **Privacy/Terms pages:** scoped to what this application actually does (Supabase Postgres storage with RLS, Stripe for Pro billing, a single essential session cookie, CSV/JSON export via the existing Export feature) - no claims about compliance frameworks or self-service capabilities (e.g. account deletion) this app hasn't actually built; both direct that request to `siteConfig.supportEmail` instead.
- New shared UI primitive `src/shared/components/ui/accordion.tsx` (Base UI's already-installed `@base-ui/react/accordion`, no new dependency) - backs the FAQ section, this codebase's first collapsible list.
- **SEO:** `src/app/robots.ts`/`sitemap.ts` (Next.js file conventions, rendered as `/robots.txt`/`/sitemap.xml`) - every `(dashboard)` route is disallowed/excluded, since none of them are indexable (login-gated) anyway. `src/features/marketing/utils/seo.ts` (pure): `buildCanonicalUrl` (the one place `env.appUrl` is joined against a path - `robots.ts`/`sitemap.ts`/every marketing page's `metadata.alternates.canonical` all reuse it), `buildOrganizationJsonLd`/`buildWebsiteJsonLd`/`buildFaqJsonLd` (the FAQ page's structured data is built from the exact same `FAQ_ITEMS` list the visible FAQ accordion renders, so the two can never drift apart). Root `layout.tsx` gained `metadataBase` (so relative OG/Twitter images resolve absolutely) and default `openGraph`/`twitter` fields.
- **Performance:** every marketing page except the homepage (which needs the signed-in-redirect check) is a fully static Server Component with no data fetching at all - confirmed by `npm run build`'s own route table (○, prerendered). Fonts were already optimized via `next/font/google` (Phase 1) - reused as-is, nothing new needed. No raster image assets were added anywhere (the hero mockup and OG image are both generated from JSX/CSS), so there is nothing new to lazy-load or compress.
- **Bug caught and fixed before merge:** the Contact page's first draft passed the support email as `render`'s own child text (`render={<a>{email}</a>}`) *and* separate `Button` children ("Email us") - Base UI's `render` prop replaces the rendered element's children with the `Button`'s own, so the email text would have silently never appeared. Fixed to pass the email as the `Button`'s only children.

### Documentation updated

- `USER_GUIDE.md` - new "Before you sign in: the public website" note under Introduction, pointing prospective users at Features/Pricing/About/Contact/Privacy/Terms before they ever create an account.
- `CHANGELOG.md` - this entry.

### Testing

- No component-rendering tests, per this suite's existing philosophy - the marketing pages/sections themselves (Hero, Header, Footer, feature grid, testimonials, FAQ) are presentational only and untested, matching how this codebase has never tested purely-presentational components. Added: `seo.test.ts` (canonical URL resolution, and that both JSON-LD builders return correctly-shaped, non-fabricated structured data derived from their inputs); `robots.test.ts` (every dashboard route disallowed, sitemap URL present); `sitemap.test.ts` (every public page included, every dashboard route absent, home page has the highest priority, every URL is valid/absolute).
- `npm run typecheck`, `npm run lint`, `npm run test` (430 tests, 36 files - 3 new files, 14 new tests), and `npm run build` all pass - the build's own route table confirms `/`, `/features`, `/plans`, `/about`, `/contact`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml` are all correctly collected, and that the existing `/pricing` (dashboard) route is completely unaffected.
- Not verified in a browser or against a live database in this environment - same persistent limitation as every phase since Phase 4.

---

## Phase 38 — Production Billing (2026-07-24)

Replaced every Phase 31.5 UI-only billing placeholder with real Stripe integration: Checkout (Monthly/Yearly), the Customer Portal, and full production webhook handling - `BillingService`'s existing entitlement contract, the `subscriptions` schema, and every call site of `UpgradeButton`/`ManageSubscriptionButton` are all reused completely unchanged in shape, only their behavior became real.

### Phase numbering note

This session's instructions labeled this "Phase 38," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 38 ("Application Goals / Weekly Objectives," already implemented under a different label at this session's own "Phase 35"). Recorded under this label only to match the session's own request, per the same practice established at Phase 31/34/35/36/37 - it does not claim or displace the document's actual Phase 38.

### Architecture

- **Reuse, not redesign:** the three-Service split this feature already had (`BillingService` for entitlements, `BillingWebhookService` for event processing) gained exactly one new sibling, `BillingCheckoutService` (Checkout Session + Customer Portal session creation) - neither existing Service was restructured. `BillingRepository`/`BillingWebhookRepository` kept their existing shapes, only gaining new fields/methods.
- **Database (`Never duplicate data already managed elsewhere`):** `subscriptions` gained exactly three new columns - `billing_interval` (mirrors the subscribed Price's own `recurring.interval`), `cancel_at` (the "Cancellation Date" - Stripe's `cancel_at` if scheduled, else `canceled_at` if already ended), and `latest_invoice_id`. `plan`/`status`/`stripe_customer_id`/`stripe_subscription_id`/`current_period_end` (the "Renewal Date") are all reused exactly as Phase 23 defined them - no redundant "renewal_date" or "payment_status" column was added (payment status is derived from `status` alone, `past_due`/`unpaid`, in `SubscriptionSection`).
- **Entitlement derivation, the one place it happens (`BUSINESS_RULES.md` "Billing"):** `BillingWebhookService.derivePlanFromStatus` maps Stripe's own subscription status to `plan` - `trialing`/`active`/`past_due` grant Pro (a failed renewal charge starts a grace period, retryable through the Customer Portal, rather than instantly revoking access), every other status reverts to Free. This is the exact rule `BUSINESS_RULES.md` had already documented in Phase 23 as "unreachable... until the eventual Checkout implementation" - this phase is that implementation.
- **Customer linking:** `checkout.session.completed`'s `client_reference_id` (set to the user's own id when `BillingCheckoutService.createCheckoutSession` creates the session) is resolved back to a `subscriptions` row by the new `BillingWebhookRepository.linkStripeCustomer` - closing the exact gap `syncByStripeCustomerId`'s own Phase 23 comment had flagged ("a stripe_customer_id with no matching row means Checkout hasn't linked it to a user yet").
- **One shared sync path for every subscription-shaped event:** `customer.subscription.created`/`updated`/`deleted`/`resumed`/`paused` are all handled by the exact same `buildSubscriptionFields`/`syncSubscription` pair - Stripe's payload for each is always the subscription's full current state, never a delta, so there is exactly one place this mapping happens ("avoid duplicated logic"). `invoice.payment_succeeded`/`payment_failed` only ever touch `latest_invoice_id` - `status` is already kept correct by the `subscription.updated` event Stripe fires alongside a failed/recovered renewal, so entitlements are never redecided a second time from an invoice event.
- **Idempotency ("Duplicate Events"):** a new `stripe_webhook_events` table (id = the Stripe event id) is checked *before* processing and recorded only *after* a fully successful process - a genuine retry of an already-processed event is recognized and skipped, while a failed attempt (never recorded) stays retryable on Stripe's next delivery. A true concurrent double-delivery racing past the check is an accepted, harmless edge case: every sync here sets columns to their latest known state, never increments/appends.
- **Error handling** ("Expired Checkout Session," "Missing Customer," "Missing Subscription," "Network Errors"): every Stripe API call in `BillingCheckoutService` is wrapped in try/catch, translating any failure into the same generic, friendly `ActionResult` error shape every other Service in this codebase already uses - never a raw Stripe/network exception reaching the client. Already-Pro users are rejected before Stripe is ever called; a Checkout attempt with no configured Price id for the requested interval fails the same friendly way. `createBillingPortalSession` returns Not Found when no Stripe customer is linked yet, rather than crashing.
- **"Products and Prices must be configurable through environment variables. Never hardcode Price IDs":** `STRIPE_PRO_MONTHLY_PRICE_ID`/`STRIPE_PRO_YEARLY_PRICE_ID` (new), read only by `getStripeProPriceId` (`lib/stripe.ts`) - `BillingCheckoutService` never touches `process.env` directly. Free has no Stripe product/price at all.
- **Test Mode / Live Mode:** determined entirely by which `STRIPE_SECRET_KEY` is configured (`sk_test_...` vs `sk_live_...`) - no code path branches on an environment flag, so no code change is needed to switch between them.

### Server Actions & UI

- New `src/features/billing/actions/billing.actions.ts`: `createCheckoutSessionAction(interval)` and `createBillingPortalSessionAction()` - both call Next's `redirect()` to the Stripe-hosted URL on success (the only "success" outcome; there is nothing to return to the caller), or return a friendly `ActionResult` error otherwise. "Use server-side actions only": neither is a JSON API route.
- `UpgradeButton`/`ManageSubscriptionButton` - the exact same components every existing call site (Pricing/Plans pages, Subscription section, Upgrade dialog, Limit Reached dialog) already rendered now call these real actions instead of showing a placeholder toast - **no call site needed to change** to get real Checkout/Portal behavior.
- `PricingPlans`/`SubscriptionSection` - the Pro card/section now shows two `UpgradeButton`s ("Upgrade monthly"/"Upgrade yearly") instead of one, each passing its own `interval`. No dollar amount is displayed anywhere in this application's own UI - Stripe Checkout itself is the source of truth for price, and hardcoding a display price here risked silently drifting from whatever the configured Stripe Price actually charges.
- `SubscriptionSection` also now shows **Billing interval** (Monthly/Yearly), a payment-failure banner (derived from `status` being `past_due`/`unpaid` - "PAYMENT FAILURE": "Display clear messaging when payment fails"), and a cancellation banner when `cancel_at` is set (relabeling "Renewal date" to "Ends on").
- New `CheckoutReturnNotice` (Settings page): reads the `?checkout=success|cancelled` marker Stripe's own `success_url`/`cancel_url` redirect back with, shows a matching toast, then strips the param from the URL - it never re-verifies payment itself (the webhook alone is the source of truth for entitlements, "Never trust client-side state").

### Documentation updated

- `DATABASE.md` - `subscriptions`' three new columns and the new `subscription_billing_interval` enum documented; new `stripe_webhook_events` table.
- `API.md` - new "Create Checkout Session"/"Create Billing Portal Session" endpoints under "Subscription"; new "Webhooks" section documenting every handled Stripe event type and the idempotency contract.
- `USER_GUIDE.md` - "Plans & Billing" gained "Upgrading to Pro," "Managing your subscription," and "If a payment fails" subsections, replacing the placeholder-era description; two new FAQ entries (data safety on cancellation/payment failure; that payment details are never stored by this application).
- `DEPLOYMENT.md` - documented the two new Price id environment variables and a complete, in-order "Production Billing Setup" walkthrough (Stripe Products/Prices, Customer Portal configuration, webhook endpoint/events, environment variables, Test Mode verification, then Live Mode cutover).
- `BUSINESS_RULES.md` - the Phase 23 note describing the Pro-plan rule as "currently unreachable" is updated to describe Phase 38's actual `derivePlanFromStatus` mapping now that it is reachable.
- `.env.example` - the two new Price id variables.

### Testing

- No component-rendering tests, per this suite's existing philosophy; Stripe itself is entirely mocked, never called for real. Added: `billing-webhook.service.test.ts` (idempotency - duplicate events skipped, events recorded only after success, a failed sync leaves the event retryable; every subscription-lifecycle event type synced through the shared path; every Stripe status correctly mapped to `plan`; `current_period_end`/`billing_interval` extraction; `cancel_at` preferring the scheduled date over the actual one, and falling back correctly; customer id resolution whether expanded or not; `checkout.session.completed`'s customer-linking and subscription-fetch-then-sync, including the "no subscription"/"no client_reference_id" graceful paths; invoice events recording only `latest_invoice_id`, including the "no customer" graceful path); `billing-checkout.service.test.ts` (already-Pro rejection, subscription-lookup failure, misconfigured Price id, reusing an existing Stripe customer vs. `customer_email`, a missing session url, Stripe/network failures for both Checkout and the Billing Portal, and the Billing Portal's "no customer yet" Not Found case). `billing.service.test.ts` (existing, unchanged) continues to pass entirely as-is - entitlement logic itself was never touched.
- `npm run typecheck`, `npm run lint`, `npm run test` (468 tests, 38 files - 2 new files, 38 new tests), and `npm run build` all pass, including the existing `(dashboard)/pricing` route and the `/api/webhooks/stripe` Route Handler both continuing to compile and collect correctly.
- Not verified against a real Stripe account, a live database, or in a browser in this environment - same persistent limitation as every phase since Phase 4. In particular, the full Checkout -> webhook -> UI-reflects-Pro round trip described in `DEPLOYMENT.md`'s new setup walkthrough has not been exercised end-to-end against Stripe's actual API.

---

## Phase 40 — UX Refinement & Workflow Simplification (2026-07-24)

Workflow simplification, not a new feature phase: "creating an application is the central workflow" (this phase's own design principle) - Companies and CVs become supporting resources reachable inline, never a prerequisite. No breaking changes to the schema/architecture beyond the additive `cv_versions` file columns below; every existing relationship (FKs, uniqueness rules, RLS) is unchanged.

### Phase numbering note

This session's instructions labeled this "Phase 40," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 40 ("Account Deletion / Danger Zone," not yet implemented under any label in this session). Recorded under this label only to match the session's own request, per the same practice established at every prior mismatched phase since 31.

### New Application Workflow

- `NewApplicationButton` (new): a single "+ New Application" entry point - opens a small choice dialog ("Import from job URL (Pro)" / "Create manually"), then hands off to the existing, unmodified `ImportJobDialog` (Smart Job Import, Phase 32) or `ApplicationFormDialog`. Replaces the old side-by-side "Import job" / "Create application" buttons on the Applications page, and the "Create application" button inside Dashboard's Quick Actions.

### Company Selection

- `CompanyCombobox` (new, `features/companies`): a type-to-filter combobox (wraps the `Combobox` shared primitive added in an earlier phase but never wired up until now) - typing filters the existing company list, and when nothing matches, a "Create '<query>'" row creates it inline via the same `createCompanyAction` `CompanyFormDialog` already uses. `ApplicationForm`'s Company field now uses this instead of a plain `Select`; a newly created company is appended to the form's own option list and selected immediately, with no page reload or refetch. The Companies page is unchanged code-wise, but its empty state now explains that companies are normally created from the application form.

### CV Library (real file storage)

- `cv_versions` gains four nullable columns - `file_path`, `file_name`, `file_size`, `uploaded_at` (migration `20260726090000_cv_file_storage.sql`) - and a new private Supabase Storage bucket, `cv-files` (5 MB limit, PDF only), with an RLS policy on `storage.objects` scoped to the object key's leading `<user_id>` segment - the same ownership check every table's own RLS policy already uses. This supersedes `DEPLOYMENT.md`'s previous "Supabase Storage should not be configured."
- Every new CV version now requires a real PDF upload (`CVVersionService.create` uploads the file first, under a freshly generated id, then creates the row referencing it - the row is only created once the upload succeeds, and the upload is cleaned up if the row insert then fails, e.g. a concurrent duplicate name). CV versions created before this phase, which have no file, remain fully valid.
- `CVVersionForm` now includes a PDF file field (required to create, optional "Replace PDF" when editing) alongside the existing name/description fields, submitted as `FormData` (the only way a `File` can reach a Server Action) - `createCVVersionAction`/`updateCVVersionAction` were updated accordingly.
- `CVVersionsTable` gained a Download action (mints a short-lived signed URL via a new `getCVDownloadUrlAction`, available for archived rows too) and a File column.

### CV Deletion

- Per this phase's own explicit decision, **no hard-delete capability was added anywhere** - "permanent deletion" for an unused CV version is the existing archive (soft-delete) mechanism, just relabeled "Delete" in the UI, since an unused CV disappearing from every list is indistinguishable from a true delete. `CVVersionService.archive` itself is unchanged: it still unconditionally rejects archiving a CV version referenced by any application (`BUSINESS_RULES.md` "CV Rules" - unaffected by this phase). When that happens, `CVVersionsTable` now shows a dedicated "Can't delete" dialog with the exact reason (used by N applications) instead of a plain error toast, rather than offering a literal "Archive instead" action that would only fail the same way - a deliberate, narrower interpretation of the phase's own wording, chosen to avoid loosening a rule this codebase has enforced identically for Companies and CV versions since Phase 3.

### Salary

- `ApplicationForm` now shows a single "Salary (optional)" field. A new, form-only `applicationFormSchema` (separate from the existing, unchanged `createApplicationSchema` the Server Actions/Service still validate against) has one `salary` field; the form maps it to `salary_min = salary_max = salary` before calling the existing create/update actions - `salary_min`/`salary_max` remain the real columns, untouched, so any existing genuine range survives until the application is next edited and saved through this form. The Application Detail page's salary display (`formatSalary`, new pure util in `features/applications/utils/salary.ts`) now collapses an equal min/max into one value instead of showing e.g. "50000–50000 EUR".

### Application Filters

- `ApplicationFilterBar` now shows only Search/Status/Company by default; CV version/Source/Work mode/Employment type/Date range/Salary range/Sort live inside a collapsed "More filters" panel (reusing the `Accordion` primitive added in Phase 37, not a new disclosure component), auto-expanded whenever any of those filters is already active from the URL so an applied filter is never silently hidden.

### Dashboard

- `QuickActions` now renders only the single `NewApplicationButton`, replacing the previous three buttons (Create Company / Create CV / Create Application).

### Follow-up: CV selection workflow redesign

User feedback after the above: mixing "select an existing CV" and "create a new CV" inside one dropdown (via the "+ Upload new CV" item, which opened `CVVersionFormDialog` on top of the already-open application dialog) felt clunky - the dropdown grew unpredictably, the create option looked visually detached, and the nested-modal-on-modal flow was awkward. Resolved by treating them as the genuinely different actions they are, per this follow-up's own explicit design principle:

- `ApplicationForm`'s CV field is now a plain `Select` of existing CV versions only - no inline creation, no nested dialog. `CVVersionFormDialog`'s optional `onSuccess` passthrough (added only to support the removed inline flow) was reverted along with it.
- When the user has zero CV versions, the field shows a friendly empty state ("No CVs available. You need at least one CV before creating an application.") with a single "Open My CVs" link to the CV Versions page - never another modal.
- Company selection is unaffected: the `CompanyCombobox` inline-create flow stays, since a company only ever needs a name (no file, no dedicated management form) - the tension this follow-up addresses is specific to CVs having a real, multi-field document-upload workflow that doesn't belong inside a lightweight application form.
- CV creation, upload, replace, and download remain exclusively on the CV Versions page, unchanged from earlier in this phase.



### Documentation updated

- `DATABASE.md` - `cv_versions`' four new columns, and a new "Storage" section documenting the `cv-files` bucket.
- `BUSINESS_RULES.md` - "CV Rules" now notes the new file requirement and explicitly confirms the archive-blocking rule (and the "no hard delete anywhere" architecture) is unchanged.
- `DEPLOYMENT.md` - "File Storage" section updated (see below).
- `USER_GUIDE.md` - updated for the new application workflow, company/CV inline creation, CV uploads, and simplified filters/salary field.

### Testing

- No component-rendering tests, per this suite's existing philosophy - `NewApplicationButton`, `CompanyCombobox`, `ApplicationForm`, `CVVersionForm`, `CVVersionsTable`, and `ApplicationFilterBar` are UI-only and not directly tested. Added: `cv-file-validation.test.ts` (PDF/size validation, byte formatting), `cv-version.service.test.ts` (new - this Service had no test file before this phase at all: upload-then-create ordering, cleanup on a failed insert, file validation, replace-in-place, signed download URL), and `salary.test.ts` (range/single-value/partial-range formatting).
- `npm run typecheck`, `npm run lint`, and `npm run test` all pass (see final count below).

### Bug fix follow-up: expected states shown as generic errors

Reported as a bug affecting CV Library, Analytics, Calendar, Goals, Pricing, and Settings' Subscription section: expected business states ("no data yet," Free plan, no subscription record) allegedly rendering as a generic "Something went wrong while loading..." error instead of a proper empty/upgrade state.

Investigating each of the six areas end-to-end (page -> Service -> Repository) found that five already implement the correct distinction, with no change needed:

- **CV Library / Goals / Calendar / Pricing / Settings**: every Repository read that can legitimately return zero rows already uses `.maybeSingle()` or a plain `.select()` (never `.single()`, which is the classic cause of this exact bug - it errors on zero rows). Every Service already null-coalesces an absent/empty result (`data ?? []`, `data ?? null`) rather than treating it as a failure, and only maps a *genuine* repository `error` to `INTERNAL_ERROR`. Free-plan gating is its own `FORBIDDEN` error code, which Calendar's and Goals' pages already branch on to render `CalendarGate`/`GoalsGate` (the upgrade teaser) instead of the error paragraph. A missing `subscriptions` row (Pricing/Settings) already resolves to `data: null` -> `isPro = false` -> Free plan, never an error - and in practice every user gets a row eagerly at signup via the `handle_new_user` trigger anyway. `CVVersionsTable`/`GoalsBoard`/`CalendarAgendaView`/`CalendarWeekView` all already render a dedicated empty state when their list is empty.
- **Analytics** was the one genuine gap: `AnalyticsService.getSummary` already degraded to zeroed-out data correctly (not an error), but `analytics/page.tsx` had no page-level notion of "zero applications" at all - it rendered every one of its nine widgets in their individually empty/zeroed form (0% rate cards, an empty funnel, an empty insights list, nine separate "no X data yet" mini-messages), which reads as a broken/half-loaded page rather than one clear "you haven't started" state, even though nothing was actually erroring.

Fixed the Analytics gap explicitly rather than inferring it indirectly: `AnalyticsSummary` gained a `totalApplications: number` field (`AnalyticsService.getSummary` now returns `applications.length` directly, the same array it already had in scope), and `analytics/page.tsx` branches on `totalApplications === 0` to render one `EmptyState` ("No analytics yet" + a "Create your first application" link) instead of the full widget grid.

No schema, Repository, or business-rule changes were needed for this fix - it is UI/Service-shape only, and purely additive to `AnalyticsSummary`.

### Testing (bug fix)

- `analytics.service.test.ts`: added a `getSummary` describe block (previously untested directly, only via `analytics-calculations.test.ts`'s pure-function coverage) - asserts `totalApplications: 0` for a user with no applications, and that it matches the fetched application count otherwise.
- `npm run typecheck`, `npm run lint`, `npm run test` (519 tests, 42 files), and `npm run build` all pass.

### Bug fix: CV Select showed a raw UUID instead of the CV name, and warned about becoming controlled

`ApplicationForm`'s CV version `Select` (and the identical pattern in `ChangeApplicationStatusDialog` and `JobImportReviewForm`) used `value={field.value || undefined}`. Since the underlying field defaults to `""` (or `undefined`), this coerced the very first render to an actual `undefined` value - Base UI's `Select` reads that as "uncontrolled, manage your own selection state." Once a value was picked, `field.value` became a real string, so `value` flipped from `undefined` to defined on a *later* render - React's "changing an uncontrolled component to be controlled" warning, and the reason the trigger displayed the raw id instead of the matching item's label (the label lookup had already run once against the component's own internal uncontrolled state). Fixed at all three call sites with `field.value ?? ""` - always a defined string, so the `Select` is controlled from the first render; `""` itself already means "nothing selected yet" to Base UI (any value serializing to `''` shows the placeholder), so no extra sentinel value was needed.

### Bug fix follow-up: adapting to Supabase's generated types instead of patching them

Investigating a related report (CV Library/Calendar/Goals/Pricing/Settings all showing "Something went wrong...") traced back to `src/types/supabase.ts` being out of date against the linked project's real schema - not a code defect. Regenerating it (`supabase gen types typescript --linked`) surfaced two real type mismatches, both resolved in the Repository/Service layer rather than by hand-editing the generated file (see `DECISIONS.md` "ADR-030 - Generated Type Boundaries", new this phase):

- `AnalyticsRepository`'s `StatusCountColumns`/`GroupStatisticsRow` were hand-written as non-null; the generator correctly types every SQL view column as nullable (it can't prove a `count(*) filter (...)` is never null). Now derived directly from `Database["public"]["Views"][...]["Row"]`, with `analytics-calculations.ts`'s `sumStatusCounts`/`computeGroupAnalyticsFromStatistics`/`deriveOverviewCounts` coalescing to `0` at the point of use.
- `ApplicationRepository.create`/`transitionStatus` call two RPCs whose generated `Args` types declare every parameter non-nullable, even though both functions' own SQL bodies accept and handle null (Postgres function parameters carry no NOT NULL metadata for the generator to read). Isolated with a documented `as <Fn>Args` cast at each of the two call sites - the only two RPC calls in the codebase.

Also fixed in passing: `src/types/supabase.ts` had been saved as UTF-16 (a Windows PowerShell `>` redirect default, not UTF-8) - re-encoded, no content change.

Also added this phase: `DECISIONS.md` "ADR-031 - CV File Storage (Supersedes ADR-018)" - ADR-018 ("The MVP will not store CV files") is marked superseded (left verbatim as the historical record) now that the CV Library stores real files.

### Bug fix: Application Detail page crashed when viewing an application

`applications/[id]/page.tsx` (a Server Component) passed a callback, `renderFeedback={(historyId) => <InterviewFeedbackPanel .../>}`, as a prop to `ApplicationStatusTimeline` (a Client Component). React Server Components forbid passing plain functions across that boundary - only serializable values (primitives, plain objects/arrays/Maps/Sets, and already-constructed elements) survive it. This threw on every single visit to the page, landing in the root `error.tsx` boundary. `TopNav`'s equivalent slots (`search`/`exportMenu`/`notificationBell`) were already correctly typed `React.ReactNode`, never a function, for exactly this reason - `renderFeedback` was the one place that deviated, and it went unnoticed because its only other caller (`EventDetailsPanel.tsx`) is itself a Client Component, where a function prop between two client components is completely normal.

Fixed by changing the slot from a callback to `feedbackPanels: Map<string, React.ReactNode>` - both callers now pre-render one `<InterviewFeedbackPanel>` element per timeline row (an already-constructed element is serializable across the Server/Client boundary) and pass the Map down instead.

### Product/architecture refinement: Interview Feedback scoped to interview stages

A review (see this phase's own product/architecture discussion) concluded that letting every Status History row - including "Wishlist," "Applied," "Rejected" - accept structured interview feedback didn't match either the feature's own documented intent ("a single interview stage," per `BUSINESS_RULES.md`/`FEATURES.md`, from the start) or its field shape (a 1-5 rating and a Phone/Video/On-site/Technical/Behavioral format don't describe a non-interview transition). Free-text `application_notes` already covers "write anything, at any stage," so restricting Interview Feedback's *structured* data to actual interview stages loses no expressiveness.

- `InterviewFeedbackService.create` now rejects creating feedback against a Status History entry whose status isn't an interview stage. `update`/`archive` are untouched and carry no such check, by design.
- `applications/[id]/page.tsx` and `EventDetailsPanel.tsx` only build a `feedbackPanels` Map entry (and so only render an "Add feedback" affordance) for an interview-stage row, or a row that already has feedback attached from before this rule existed - existing feedback is never hidden, and remains fully viewable/editable/archivable regardless of the stage it's attached to.
- No database constraint or trigger was added - this is a Service-layer business rule, consistent with every other rule in this codebase (ADR-028 "Simplicity").
- `BUSINESS_RULES.md`/`FEATURES.md` updated to reference `INTERVIEW_STAGE_ONLY_STATUSES` by name rather than restating the eligible statuses in prose, so the documentation can't drift from the code if an interview stage is ever added or renamed.
- Follow-up: the Service and both UI call sites initially each wrote their own `INTERVIEW_STAGE_ONLY_STATUSES.includes(status)` inline - same constant, but three independent copies of the check itself. Extracted `isInterviewStageStatus(status)` (`application.constants.ts`, next to the constant it wraps) so there is exactly one definition of "eligible interview stage," called from all three places.

### Testing (Interview Feedback scoping)

- `application.constants.test.ts`: new `isInterviewStageStatus` describe block - every application status, parameterized, confirming exactly the three interview stages return `true`.
- `interview-feedback.service.test.ts`: updated the two existing `create` success tests to target an interview-stage entry (they previously used the shared `historyEntry()` fixture's default status, "Recruiter Contact," which the new rule now correctly rejects). Added: parameterized tests confirming `create` succeeds for HR Interview/Technical Interview/Final Interview and is rejected (`VALIDATION_ERROR`) for Applied/Wishlist/Rejected, and a test confirming `update` succeeds regardless of the history entry's status (legacy feedback on a non-interview stage stays editable) without even consulting `ApplicationStatusService`.
- `npm run typecheck`, `npm run lint`, `npm run test` (535 tests, 42 files), and `npm run build` all pass.

### Developer Dogfooding: the application owner's account always sees the Pro plan

Requested so the application owner (`polgoca@gmail.com`) can use every Pro-gated feature while building and testing them, before the product has any real paying customers - narrowly scoped, never a general mechanism.

- New `isDeveloperAccount(email)` (`src/features/billing/constants/developer-account.ts`) - a pure, hardcoded email comparison, fully documented in place (why hardcoded rather than an env var or DB flag, and the exact two-call-site removal steps for once real Pro customers exist).
- Consulted from exactly one place, `BillingService` (a private `isDeveloperUser(userId)` helper resolving the account's email via `UserService.getProfile` - the same cross-feature "Service calls Service" pattern already used throughout this codebase) - never checked anywhere else, and never bypasses a feature gate directly: every Pro-only code path still goes through the exact same `BillingService` methods every other request does.
  - `getIsProPlan` (the single function `requireProPlan`/`requireApplicationCapacity`/`getApplicationUsage` all funnel through): checks the real subscription first; only falls back to the developer-account check when the real answer is "not Pro," so a real paying Pro user's request never pays for the extra lookup.
  - `getSubscriptionForUser` (backs the Pricing/Settings display): same fallback, returning the real row with only `plan`/`status` overridden to `pro`/`active` for display - every other field (including `stripe_customer_id: null`) is left exactly as stored, so "Manage subscription" correctly has nothing real to manage. This is a display-only override; nothing is written to the database.
- No Stripe configuration, database row, or feature-gate check was modified - the exception lives entirely in `BillingService`'s own entitlement decision.
- `BUSINESS_RULES.md` "Billing" documents this as a named, explicit exception to its own "single rule" statement, rather than silently no longer matching the code.

### Testing (Developer Dogfooding)

- `developer-account.test.ts` (new): the predicate matches only the exact developer email, case-sensitively, and never a missing one.
- `billing.service.test.ts`: new "Developer Dogfooding" describe block - Pro access granted for the developer account regardless of its real (Free, or entirely absent) subscription row, unlimited application usage, `getSubscriptionForUser` showing an active-Pro display without mutating the stored row, and confirmation that no other account is ever affected and that a real Pro user's request never triggers the extra lookup.
- `npm run typecheck`, `npm run lint`, `npm run test` (547 tests, 43 files), and `npm run build` all pass.

---

## Phase 39 — Production Readiness Audit (2026-07-25)

A full audit of all 38 phases before it - codebase, security, performance, database, accessibility, error handling, logging, monitoring, dependencies, and test coverage - introducing no user-facing feature. Full findings, severity ranking, and reasoning: `docs/PRODUCTION_AUDIT_REPORT.md`.

### Phase numbering note

This session's instructions labeled this "Phase 39," which conflicts with `IMPLEMENTATION_ORDER_V2.md`'s own Phase 39 ("Service-Role Client Introduction," already implemented under a different label at this session's own "Phase 23"). Recorded under this label only to match the session's own request, per the same practice established at every prior mismatched phase since 31 - it does not claim or displace the document's actual Phase 39.

### Critical finding, resolved during the audit

- `next@16.2.10` (the exact version this project had installed) carried multiple high-severity CVEs affecting Server Actions and App Router middleware directly - including unauthenticated disclosure of internal Server Function endpoints, an SSRF in Server Actions, and a middleware/proxy bypass. Upgraded to `16.2.11` (a safe patch release, not a major bump); re-auditing afterward confirms none of these remain reachable. `npm run typecheck`/`lint`/`test`/`build` all still pass.

### Fixes applied

- **Database:** dropped three single-column indexes made redundant by a composite index/unique constraint sharing the same leading column (`goals_user_id_idx`, `user_achievements_user_id_idx`, `notification_states_user_id_idx`) via a new migration (`20260725090000_audit_cleanup.sql` - never editing an already-shipped one).
- **Dependencies:** `shadcn` (the CLI-only component-scaffolding tool, never imported by application code) moved from `dependencies` to `devDependencies`.
- **Error handling:** added root `error.tsx` (Client Component, with a "Try again"/"Back to Dashboard" recovery path) and `not-found.tsx` - neither existed anywhere before, so an unhandled exception or a missing route fell through to Next's generic default pages. Added `loading.tsx` to five routes that never got one (`/calendar`, `/goals`, `/notifications`, `/pricing`, `/search`), using the exact `<PageSkeleton />` pattern every other route already used.
- **Security headers:** `next.config.ts` now sends `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security` on every response. A Content-Security-Policy was deliberately not added - see the audit report's own reasoning (needs live-browser verification this environment cannot perform).
- **Monitoring:** added `src/lib/monitoring.ts` - a vendor-agnostic `captureException`/`captureMessage`/`trackEvent` facade (console-based today, no new dependency), wired into the new `error.tsx` boundary. Swapping in a real provider later means editing this one file, never its call sites.
- **Test coverage:** added `application.service.test.ts` (26 tests) - the single most central, most complex Service in the app (capacity gating, cross-table reference validation, Postgres constraint/FK-violation-to-friendly-message mapping) had no dedicated test file at all before this phase.
- **Documentation accuracy:** corrected two `KNOWN_ISSUES.md` entries that had gone factually stale (`SUPABASE_SERVICE_ROLE_KEY remains unused` - false since Phase 23/38; the `postcss` advisory note - now also covers `sharp`, plus a new `shadcn`-only advisory note), and added a new Phase 39 entry for everything found but deliberately not fixed (rate limiting, CSP, Stripe/Supabase live verification, remaining untested Services, three still-unused `applications` columns, `env.ts`'s mixed public/private shape).

### Confirmed already correct (no change needed)

Every table has Row Level Security enabled (13/13); every RLS policy uses the `(select auth.uid())` performance pattern; every SQL statistics view is `security_invoker`; every `SECURITY DEFINER` function pins `search_path`; no table has ever been granted to `anon`; no hard `DELETE` has ever been granted anywhere; every Server Action authenticates before doing anything (verified across all 15 action files); no SQL injection surface exists; no secrets appear in any log statement; only one `dangerouslySetInnerHTML` call exists in the whole app (JSON-LD, rendering our own trusted data); no `page.tsx` anywhere is a Client Component; Stripe's Node SDK is never imported by a Client Component.

### Documentation updated

- `ARCHITECTURE.md` - new "Dependencies" section documenting why every runtime dependency exists.
- `DEPLOYMENT.md` - "Monitoring" and "HTTPS" sections updated to describe the new hook module and security headers; "Deployment Checklist" now points to the audit report's "Blocking Production" list.
- `KNOWN_ISSUES.md` - two stale entries corrected; a new Phase 39 section added for open findings.
- `docs/PRODUCTION_AUDIT_REPORT.md` (new) - the complete audit: Critical/High/Medium/Low findings, recommendations, and what remains before real users are onboarded.

### Testing

- No component-rendering tests, per this suite's existing philosophy - this phase reviewed test coverage rather than rewriting existing tests (per its own "do not rewrite tests unnecessarily"). Added: `application.service.test.ts` (capacity gating, reference-validation success/failure for both company and CV version, parallel-not-sequential validation, every Postgres constraint/FK-violation mapping including the generic fallback, trimming/normalizing/currency-uppercasing on success, and not-found/success paths for update/archive/restore/getById/list/listArchived/listAllForAnalytics/listAllIncludingArchived).
- `npm run typecheck`, `npm run lint`, `npm run test` (494 tests, 39 files - 1 new file, 26 new tests), and `npm run build` all pass, on the upgraded `next@16.2.11`.
- Not verified in a browser, against a live Supabase project, or against a real Stripe account in this environment - same persistent limitation as every phase since Phase 4, and the report's own top recommendation for what to do before onboarding real users.
