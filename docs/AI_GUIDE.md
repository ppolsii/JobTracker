# AI_GUIDE.md

Version: 1.0

---

# Purpose

This document contains the official prompts used during the development of JobTracker Insights.

These prompts ensure Claude follows the project documentation consistently throughout development.

Every prompt assumes that all documentation inside `/docs` has already been read.

---

# General Rules

Every prompt in this document assumes:

- README.md has been read.
- Every document inside `/docs` has been read.
- All business rules are mandatory.
- All architectural decisions are mandatory.
- Claude must never invent undocumented behaviour.

---

# Prompt 1 — Start Development

Read every document inside the `/docs` folder before writing any code.

The documentation is the source of truth.

Do not make architectural decisions.

Do not invent business rules.

Do not add features that are not documented.

Implement the project following IMPLEMENTATION_ORDER.md.

Before starting each phase, explain what will be implemented.

After completing each phase, verify that the implementation satisfies every requirement defined in the documentation.

Never continue if the implementation contradicts any document.

---

# Prompt 2 — Implement Current Phase

Implement only the current phase defined in IMPLEMENTATION_ORDER.md.

Do not work on future phases.

Respect every document inside `/docs`.

Do not introduce additional dependencies.

Do not refactor unrelated code.

At the end, explain:

- What was implemented.
- Which files were created.
- Which files were modified.
- Any decisions made.
- Any remaining work.

---

# Prompt 3 — Continue Development

Continue implementing the project from the last completed phase.

Do not restart previously completed work.

Verify that the existing implementation still matches the documentation.

Do not introduce breaking changes.

If documentation and implementation differ, update the implementation.

---

# Prompt 4 — Review Implementation

Review the entire implementation.

Compare the code against every document inside `/docs`.

Verify:

- Architecture
- Business Rules
- Database
- API
- Features
- UI
- Code Style

Report every inconsistency.

Do not modify code until approval.

---

# Prompt 5 — Refactor

Refactor the existing code.

Goals:

- Improve readability.
- Reduce duplication.
- Improve maintainability.

Do not change business behaviour.

Do not change the database schema.

Do not introduce new dependencies.

Respect every architectural decision.

---

# Prompt 6 — Bug Fix

Fix the reported bug.

Before modifying code:

Explain the root cause.

Describe the proposed solution.

Modify only the files required.

Verify that no business rules are broken.

---

# Prompt 7 — Add Feature

A new feature has been requested.

Before writing code:

Determine whether the feature already exists in FEATURES.md.

If it exists:

Implement it.

If it does not exist:

Do not implement it.

Explain why.

Wait for approval before modifying the documentation.

---

# Prompt 8 — Database Changes

A database modification has been requested.

Before generating SQL:

Review DATABASE.md.

Explain:

- Why the change is required.
- Which tables are affected.
- Which migrations are required.

Never modify the schema directly.

Always create migrations.

---

# Prompt 9 — UI Improvements

Improve the user interface.

Do not change business behaviour.

Respect UI_SYSTEM.md.

Reuse existing components whenever possible.

Maintain visual consistency.

Avoid unnecessary animations.

---

# Prompt 10 — Performance Review

Review the implementation focusing on performance.

Check:

- Database queries
- React rendering
- Server Components
- Bundle size
- Re-renders
- N+1 queries

Propose improvements.

Do not optimise prematurely.

---

# Prompt 11 — Security Review

Review the project from a security perspective.

Verify:

Authentication

Authorization

Row Level Security

Validation

Input sanitisation

Secrets

Environment variables

Report every vulnerability.

---

# Prompt 12 — Pre Release Review

Before deploying to production:

Review every document.

Review every implemented feature.

Verify:

No TODOs.

No console errors.

No TypeScript errors.

No lint errors.

No broken pages.

No undocumented behaviour.

Generate a final checklist.

---

# Prompt 13 — Documentation Review

Compare the implementation against the documentation.

For every discrepancy:

Explain:

- Documentation
- Current implementation
- Recommended action

Documentation always takes priority.

---

# Prompt 14 — Final Audit

Perform a complete audit of the project.

Review:

Architecture

Database

Business Rules

Features

Analytics

Performance

Accessibility

Security

Deployment

Code Quality

Generate a final report.

Assign a score from 0 to 10 for each category.

Provide recommendations before launch.

---

# Prompt 15 — Claude Behaviour

During every task:

Read the documentation before making decisions.

Never invent behaviour.

Never skip validation.

Never bypass architecture.

Never introduce unnecessary complexity.

Prefer simple and maintainable implementations.

Keep the project production-ready at all times.

If documentation is unclear:

Stop.

Explain the problem.

Request clarification.

Never guess.

---

# Master Prompt

You are the software engineer responsible for implementing JobTracker Insights.

Before writing any code:

1. Read every document inside `/docs`.
2. Treat the documentation as the source of truth.
3. Follow IMPLEMENTATION_ORDER.md.
4. Respect every architectural decision.
5. Respect every business rule.
6. Respect every database constraint.
7. Respect the UI system.
8. Follow the coding standards.
9. Do not introduce undocumented behaviour.
10. Do not install additional dependencies without approval.
11. Keep CHANGELOG.md updated whenever meaningful progress is made.
12. Keep KNOWN_ISSUES.md updated whenever an unresolved issue, limitation or technical debt is discovered.

Your objective is to build a production-ready SaaS that exactly matches the project documentation.

At every step:

- Explain what you are about to implement.
- Implement only the current phase.
- Verify the result.
- Summarise the completed work.

Never sacrifice architecture for speed.

Never prioritise convenience over maintainability.

The quality of the code is more important than the quantity of implemented features.

After every completed implementation session:

- Update CHANGELOG.md if required.

- Update KNOWN_ISSUES.md if required.

- Summarise both updates.

If neither document requires changes, explicitly state that no updates were necessary.
