# IMPLEMENTATION_ORDER.md

Version: 1.0

---

# Purpose

This document defines the mandatory implementation order for JobTracker Insights.

Claude MUST follow this order unless explicitly instructed otherwise.

The objective is to minimise refactoring and ensure every feature is built on top of stable foundations.

Do not skip phases.

Do not implement future phases before completing the current one.

---

# General Principles

Every phase must produce a working application.

The application should always remain buildable.

The application should never remain in a broken state.

Every completed phase should be committed before starting the next one.

---

# Phase 1 — Project Setup

Objective

Create the project foundation.

Tasks

- Create Next.js project.
- Configure TypeScript.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Configure ESLint.
- Configure Prettier.
- Configure project aliases.
- Configure environment variables.
- Create repository structure.
- Configure Git.

Definition of Done

The application starts successfully.

No TypeScript errors.

No lint errors.

---

# Phase 2 — Supabase

Objective

Configure backend services.

Tasks

- Create Supabase project.
- Configure authentication.
- Configure database connection.
- Configure server client.
- Configure browser client.
- Configure environment variables.

Definition of Done

Application successfully connects to Supabase.

Authentication is operational.

---

# Phase 3 — Database

Objective

Create database schema.

Tasks

- Create enums.
- Create tables.
- Create indexes.
- Configure foreign keys.
- Configure triggers.
- Configure Row Level Security.
- Create migrations.

Definition of Done

Database schema matches DATABASE.md.

---

# Phase 4 — Authentication

Objective

Secure the application.

Tasks

- Register page.
- Login page.
- Logout.
- Session handling.
- Protected routes.
- Password reset.

Definition of Done

Unauthenticated users cannot access protected pages.

---

# Phase 5 — Shared UI

Objective

Build reusable UI.

Tasks

- Main Layout.
- Sidebar.
- Top Navigation.
- Theme Toggle.
- Buttons.
- Forms.
- Inputs.
- Dialogs.
- Toasts.
- Tables.
- Loading Components.
- Empty States.

Definition of Done

Every reusable UI component exists.

---

# Phase 6 — Company Management

Objective

Implement company management.

Tasks

- CRUD.
- Search.
- Validation.
- Archive.

Definition of Done

Users can manage companies.

---

# Phase 7 — CV Version Management

Objective

Implement CV management.

Tasks

- CRUD.
- Validation.
- Archive.

Definition of Done

Users can manage CV versions.

---

# Phase 8 — Application Management

Objective

Implement the core feature.

Tasks

- Create applications.
- Edit applications.
- Archive applications.
- Search.
- Filtering.
- Sorting.
- Pagination.

Definition of Done

Users can fully manage applications.

---

# Phase 9 — Status Tracking

Objective

Implement recruitment workflow.

Tasks

- Status transitions.
- Status history.
- Validation.
- Timeline.

Definition of Done

Every transition creates history.

Business rules are respected.

---

# Phase 10 — Notes

Objective

Attach notes to applications.

Tasks

- Create.
- Edit.
- Archive.

Definition of Done

Notes work correctly.

---

# Phase 11 — Dashboard

Objective

Create the dashboard.

Tasks

- KPI cards.
- Recent applications.
- Quick actions.
- Dashboard layout.

Definition of Done

Dashboard displays real data.

---

# Phase 12 — Analytics

Objective

Implement the Analytics Engine.

Tasks

- Response Rate.
- Interview Rate.
- Offer Rate.
- Monthly Analytics.
- Company Analytics.
- CV Analytics.
- Source Analytics.
- Funnel Analytics.
- Insights.

Definition of Done

Analytics match ANALYTICS_ENGINE.md.

---

# Phase 13 — Search

Objective

Implement global search.

Tasks

- Search applications.
- Search companies.
- Search notes.

Definition of Done

Search works across the application.

---

# Phase 14 — Export

Objective

Allow users to export their data.

Tasks

- CSV Export.
- JSON Export.

Definition of Done

Users can export all personal data.

---

# Phase 15 — Settings

Objective

Implement settings.

Tasks

- Profile.
- Theme.
- Account.

Definition of Done

Users can configure the application.

---

# Phase 16 — Optimisation

Objective

Improve performance.

Tasks

- Query optimisation.
- Component optimisation.
- Remove duplicated code.
- Improve loading states.

Definition of Done

Performance goals are satisfied.

---

# Phase 17 — Testing

Objective

Validate the application.

Tasks

- Unit Tests.
- Integration Tests.
- End-to-End Tests.

Definition of Done

Critical workflows are covered.

---

# Phase 18 — Production Ready

Objective

Prepare release.

Tasks

- Final review.
- Accessibility.
- Responsive review.
- Security review.
- Documentation review.
- Production deployment.

Definition of Done

Application is production ready.

---

# Quality Gates

Before moving to the next phase:

✓ Build succeeds.

✓ TypeScript passes.

✓ Lint passes.

✓ Tests pass.

✓ No console errors.

✓ Documentation remains valid.

---

# Forbidden

Do not implement features from future phases.

Do not skip validation.

Do not refactor unrelated code.

Do not introduce new dependencies without approval.

Do not modify previous phases unless fixing a bug.

---

# Claude Instructions

Follow this implementation order exactly.

Complete each phase before starting the next.

Do not anticipate future features.

Every phase should leave the project in a stable, working and deployable state.

If a later phase requires changes to an earlier one, keep those changes minimal and preserve backwards compatibility whenever possible.
