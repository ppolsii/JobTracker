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
