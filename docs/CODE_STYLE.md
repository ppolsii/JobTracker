# CODE_STYLE.md

Version: 1.0

---

# Purpose

This document defines the coding standards for JobTracker Insights.

Every file generated during development must follow these conventions.

Consistency is more important than personal preferences.

If multiple coding styles are possible, always follow this document.

---

# General Principles

Every piece of code should be:

- Readable
- Predictable
- Maintainable
- Explicit
- Reusable
- Type Safe

Avoid clever solutions.

Prefer simple and obvious implementations.

Code is written for humans first.

---

# Language

Use TypeScript exclusively.

JavaScript is forbidden.

Enable strict mode.

Never disable TypeScript checks.

---

# Naming

Use English everywhere.

Examples

Variables

application

company

dashboardMetrics

---

Functions

createApplication()

updateApplication()

calculateResponseRate()

---

Components

ApplicationCard

DashboardHeader

CompanyTable

AnalyticsChart

---

Hooks

useApplications()

useDashboard()

useTheme()

---

Server Actions

createApplicationAction()

updateCompanyAction()

deleteCVVersionAction()

---

Services

ApplicationService

DashboardService

AnalyticsService

---

Repositories

ApplicationRepository

CompanyRepository

AnalyticsRepository

---

Database Tables

snake_case

applications

companies

cv_versions

application_notes

---

Database Columns

snake_case

created_at

updated_at

application_date

company_id

---

Constants

UPPER_SNAKE_CASE

MAX_PAGE_SIZE

DEFAULT_PAGE_SIZE

---

Files

PascalCase

ApplicationCard.tsx

DashboardHeader.tsx

AnalyticsChart.tsx

---

Folders

lowercase

applications

dashboard

companies

analytics

---

# Components

Each component should have a single responsibility.

Prefer multiple small components over one large component.

Recommended maximum size

300 lines

If a component grows significantly:

Split it.

---

# Functions

Functions should do one thing.

Avoid long functions.

Recommended maximum

50 lines

If a function becomes difficult to understand:

Extract smaller functions.

---

# Comments

Write self-explanatory code.

Avoid unnecessary comments.

Use comments only when explaining:

Business rules.

Complex algorithms.

Non-obvious decisions.

Never explain obvious code.

Bad

Increment i.

Good

Calculate interview conversion rate.

---

# Types

Always define explicit types.

Avoid implicit any.

Never disable TypeScript.

Prefer interfaces for object definitions.

Prefer type aliases for unions.

---

# Validation

Validate every external input.

Use Zod.

Never trust frontend validation.

Server validation is mandatory.

---

# Error Handling

Never swallow errors.

Catch only when necessary.

Return meaningful business errors.

Do not expose implementation details.

---

# Async Code

Always use async/await.

Avoid nested promises.

Avoid callback chains.

---

# Imports

Group imports.

1.

React / Next.js

2.

External libraries

3.

Shared modules

4.

Feature modules

5.

Relative imports

Separate groups with empty lines.

---

# Dependencies

Never install new dependencies without approval.

Always prefer existing libraries.

Avoid dependency duplication.

---

# Styling

Tailwind CSS only.

No inline styles.

No CSS modules.

No styled-components.

Prefer reusable utility classes.

---

# Components

Prefer composition.

Avoid inheritance.

Avoid deeply nested JSX.

Extract repeated layouts.

---

# Props

Explicitly define props.

Avoid passing unnecessary props.

Prefer immutable props.

---

# State

Keep state as local as possible.

Do not duplicate state.

Server state belongs on the server.

---

# Server Actions

Server Actions should:

Validate input.

Authenticate user.

Call Service.

Return result.

Nothing more.

---

# Services

Services contain:

Business logic.

Business validation.

Analytics calculations.

Workflow orchestration.

Services never:

Render UI.

Access browser APIs.

---

# Repositories

Repositories contain:

Database queries.

Insert operations.

Update operations.

Delete operations.

Repositories never:

Contain business logic.

Call UI components.

---

# Database Queries

Always fetch only required columns.

Never use SELECT *.

Always paginate collections.

Avoid N+1 queries.

Prefer joins over multiple queries.

---

# SQL

Use parameterised queries.

Never concatenate SQL strings.

Optimise indexes before optimising code.

---

# Logging

Log unexpected errors.

Never log:

Passwords.

JWT tokens.

Secrets.

Personal sensitive information.

---

# Security

Validate ownership.

Validate permissions.

Validate UUIDs.

Validate enums.

Validate dates.

Never trust client input.

---

# Performance

Avoid unnecessary renders.

Memoize expensive calculations only when required.

Do not optimise prematurely.

Measure before optimising.

---

# Testing

Business logic should be testable.

Keep pure functions whenever possible.

Avoid hidden side effects.

---

# Accessibility

Every interactive element must:

Be keyboard accessible.

Have visible focus.

Have semantic meaning.

Support screen readers.

---

# Git

Commit messages should follow:

feat:

fix:

refactor:

docs:

test:

style:

chore:

Examples

feat: add application analytics

fix: prevent invalid status transition

refactor: simplify dashboard queries

---

# Code Review Checklist

Before considering any implementation complete verify:

✓ TypeScript passes

✓ No any

✓ No duplicated logic

✓ Business rules respected

✓ Database schema respected

✓ Responsive

✓ Accessible

✓ Validation implemented

✓ Meaningful errors

✓ No unnecessary dependencies

---

# Refactoring

Always improve readability.

Never change business behaviour during refactoring.

Small incremental improvements are preferred.

---

# Forbidden Practices

Do not use any.

Do not disable eslint rules.

Do not duplicate business logic.

Do not place SQL inside React Components.

Do not bypass Services.

Do not bypass Repositories.

Do not hardcode configuration values.

Do not hardcode URLs.

Do not hardcode colors.

Do not hardcode strings that may require localisation.

Do not overengineer.

---

# Definition of Good Code

Good code is:

Easy to read.

Easy to test.

Easy to modify.

Easy to extend.

Easy to delete.

---

# Claude Instructions

Write code as if another developer will maintain it for the next five years.

Prefer explicit implementations.

Prioritise readability over cleverness.

Never introduce unnecessary abstractions.

Generate production-quality code.

Every new file must naturally fit into the architecture defined in ARCHITECTURE.md.

Every implementation must respect BUSINESS_RULES.md, DATABASE.md and FEATURES.md.

If a coding decision is not covered by this document, choose the simplest maintainable solution.
