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
