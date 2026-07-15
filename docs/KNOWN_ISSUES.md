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
