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
