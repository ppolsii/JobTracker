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
