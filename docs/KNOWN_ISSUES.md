# KNOWN ISSUES

Tracks accepted technical debt, limitations, and postponed items.

---

## Phase 1 — Project Setup

### Import order is not automatically enforced

`CODE_STYLE.md` defines an import grouping convention (React/Next → external → shared → feature → relative). No ESLint plugin enforces this automatically — kept the dependency set minimal per `PROJECT_CONSTRAINTS.md`. Convention must be followed manually during development and code review.

### Transitive `postcss` advisory (moderate)

`npm audit` reports a moderate-severity advisory in `postcss` (bundled inside Next.js's own dependency tree, not a direct dependency). The only fix `npm audit fix --force` offers is downgrading Next.js to `9.3.3`, which contradicts ADR-001 ("latest stable version should always be used") and is not a real fix. No action taken; revisit once Next.js ships an updated internal `postcss` version.
