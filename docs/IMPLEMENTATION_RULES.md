# IMPLEMENTATION_RULES.md

Version: 1.0

---

# Purpose

This document defines the implementation rules that Claude must follow while developing JobTracker Insights.

These rules are mandatory.

They define HOW the project should be implemented.

Business logic is defined elsewhere.

Architecture is defined elsewhere.

This document defines Claude's behaviour during development.

---

# Priority

If two documents conflict, follow this order.

1. PROJECT_CONSTRAINTS.md

2. IMPLEMENTATION_RULES.md

3. DECISIONS.md

4. BUSINESS_RULES.md

5. FEATURES.md

6. DATABASE.md

7. API.md

8. ARCHITECTURE.md

9. Remaining documents

Documentation always takes precedence over implementation.

---

# General Behaviour

Before writing any code:

Read every document.

Understand the current implementation phase.

Explain what will be implemented.

Never immediately generate code.

---

# Documentation First

Documentation is always the source of truth.

Never assume behaviour.

Never invent missing functionality.

If documentation is incomplete:

Stop.

Explain what is missing.

Request clarification.

Never guess.

---

# Implementation Order

Always follow IMPLEMENTATION_ORDER.md.

Never implement future phases.

Never skip phases.

Never merge multiple phases into one implementation.

Each phase should produce a working application.

---

# Stable Development

The project must remain buildable after every implementation.

Never leave the repository in a broken state.

Every completed phase should compile successfully.

---

# Scope Control

Implement only the requested functionality.

Never add "nice to have" features.

Never implement future roadmap items.

Never anticipate future requirements.

---

# Dependency Management

Before installing any dependency:

Explain why it is needed.

Explain why existing dependencies are insufficient.

Wait for approval.

Never install packages automatically.

---

# Refactoring Rules

Refactoring is allowed only when:

It improves readability.

It removes duplicated code.

It simplifies architecture.

It does not modify behaviour.

Large refactors require approval.

---

# Architecture

Respect ARCHITECTURE.md.

Never bypass:

Services.

Repositories.

Server Actions.

Business layers.

Never introduce new architectural patterns.

---

# Database

Respect DATABASE.md.

Never modify tables without creating migrations.

Never change existing relationships.

Never denormalize the database.

Never duplicate information.

---

# Business Rules

Business rules are immutable.

Never simplify workflows.

Never remove validations.

Never modify business behaviour.

---

# API

Respect API.md.

Do not invent endpoints.

Do not rename endpoints.

Do not expose internal implementation details.

---

# UI

Respect UI_SYSTEM.md.

Reuse existing components.

Maintain consistency.

Never redesign pages without approval.

---

# Code Quality

Respect CODE_STYLE.md.

No any.

No duplicated logic.

No unnecessary abstractions.

Readable code first.

---

# Validation

Every input must be validated.

Client validation is not enough.

Server validation is mandatory.

Database constraints remain mandatory.

---

# Error Handling

Every operation should return meaningful errors.

Unexpected errors should never expose implementation details.

Never ignore exceptions.

---

# Performance

Do not optimise prematurely.

Only optimise after identifying real bottlenecks.

Prefer SQL aggregation over client-side calculations.

---

# Security

Never trust user input.

Always validate ownership.

Always respect RLS.

Never expose secrets.

Never expose Service Role Key.

---

# Git Behaviour

Every completed phase should be commit-ready.

The codebase should always remain clean.

Avoid leaving temporary code.

Avoid commented code.

Avoid TODOs unless explicitly requested.

---

# File Creation

Before creating a new file:

Verify that an appropriate file does not already exist.

Avoid duplicate utilities.

Avoid duplicate components.

Prefer extending existing code.

---

# Component Creation

Before creating a new component:

Search for reusable alternatives.

If a reusable component exists:

Use it.

Avoid unnecessary duplication.

---

# Services

Every Service should contain:

Business logic.

Validation.

Workflow orchestration.

Services must never:

Access React.

Render UI.

Contain presentation logic.

---

# Repositories

Repositories are responsible only for persistence.

Repositories should never:

Validate business rules.

Contain calculations.

Render UI.

---

# Server Actions

Server Actions should:

Authenticate.

Validate.

Call Services.

Return results.

Nothing else.

---

# Code Reviews

Before considering any task complete verify:

✓ TypeScript passes

✓ Build passes

✓ Lint passes

✓ No duplicated code

✓ No console errors

✓ No broken imports

✓ No unused variables

✓ No unnecessary dependencies

✓ Responsive

✓ Accessible

✓ Documentation still valid

---

# When To Stop

Claude must stop immediately if:

Documentation conflicts.

Requirements are ambiguous.

Business rules are unclear.

Architecture must change.

A paid service is required.

A dependency requires approval.

Database modifications are unclear.

Never continue by making assumptions.

---

# Communication

Before implementing:

Explain the plan.

During implementation:

Explain important decisions.

After implementation:

Summarise:

- Files created.
- Files modified.
- Decisions taken.
- Remaining work.

---

# Forbidden Actions

Never:

Invent functionality.

Invent business rules.

Invent API endpoints.

Invent database tables.

Invent analytics.

Invent UI behaviour.

Install dependencies automatically.

Modify project philosophy.

Change architecture.

Change technologies.

Ignore documentation.

---

# Definition of Complete

A task is complete only when:

The implementation matches the documentation.

The project builds successfully.

TypeScript passes.

Lint passes.

Business rules are respected.

Architecture is respected.

No undocumented behaviour exists.

The application remains production-ready.

---

# Claude Instructions

You are not designing the project.

The project has already been designed.

Your responsibility is to implement it faithfully.

Treat the documentation as a contract.

When documentation is clear:

Implement.

When documentation is unclear:

Stop.

Ask.

Never guess.

Consistency is more important than speed.

Maintainability is more important than cleverness.

The objective is not to generate code quickly.

The objective is to build a production-quality SaaS exactly as specified.

---

# Documentation Maintenance

The implementation documentation must always remain synchronized with the project.

After completing a development session:

Update CHANGELOG.md if:

- A feature has been completed.
- A phase has been completed.
- A bug has been fixed.
- A breaking change has been introduced.
- A dependency has been added.
- The database schema has changed.

Update KNOWN_ISSUES.md if:

- A limitation has been discovered.
- A bug is intentionally postponed.
- Technical debt has been accepted.
- A future improvement has been identified.

Never leave these documents outdated.

---

# Quality Gate

Before closing any implementation phase, Claude MUST verify:

- Production build succeeds.
- TypeScript has zero errors.
- ESLint has zero errors.
- No architectural violations exist.
- No feature imports exist inside shared/.
- No direct Supabase access exists outside repositories.
- No duplicated business logic exists.
- CHANGELOG.md is updated.
- KNOWN_ISSUES.md is updated if required.

If any verification fails, the phase MUST NOT be considered complete.