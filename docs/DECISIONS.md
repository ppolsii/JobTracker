# DECISIONS.md

Version: 1.0

---

# Purpose

This document contains all Architecture Decision Records (ADR) for JobTracker Insights.

Every decision documented here is considered final.

Claude MUST follow these decisions exactly.

If an implementation could be achieved in multiple ways, this document determines the correct approach.

Claude MUST NOT replace technologies, architectural patterns or libraries defined here unless explicitly instructed.

---

# ADR-001 — Framework

## Decision

The application will be built using Next.js.

The latest stable version should always be used.

Only the App Router is allowed.

## Reason

Next.js provides an excellent developer experience, production-ready architecture, Server Components, Server Actions and seamless deployment with Vercel.

---

# ADR-002 — Programming Language

## Decision

The entire codebase must be written in TypeScript.

JavaScript files are forbidden.

Strict TypeScript mode must always be enabled.

## Reason

Type safety reduces bugs and improves maintainability.

---

# ADR-003 — Database

## Decision

The application will use PostgreSQL.

Supabase will act as the PostgreSQL provider.

The application must never rely on Supabase-specific features that prevent future migration unless there is no reasonable alternative.

## Reason

PostgreSQL provides excellent relational capabilities and powerful SQL aggregation for analytics.

---

# ADR-004 — Authentication

## Decision

Authentication will be handled exclusively by Supabase Auth.

The application must never implement a custom authentication system.

Passwords must never be stored or processed manually.

## Reason

Authentication is already solved by Supabase.

---

# ADR-005 — Authorization

## Decision

Authorization will be enforced using PostgreSQL Row Level Security (RLS).

Frontend validation is not considered security.

Backend validation is mandatory.

## Reason

Security must always be enforced at database level.

---

# ADR-006 — Architecture

## Decision

The project will use a Feature-First Architecture.

Code must be grouped by business domain rather than by technical type.

## Reason

Feature-based architecture scales much better for SaaS applications.

---

# ADR-007 — Business Logic

## Decision

Business logic must never exist inside React components.

Business logic belongs inside Services.

React components are responsible only for presentation.

## Reason

Separating UI from business logic improves maintainability and testing.

---

# ADR-008 — Data Access

## Decision

Only Repository modules may access Supabase.

React Components must never communicate directly with the database.

Services communicate with repositories.

Repositories communicate with Supabase.

## Reason

Centralises persistence and simplifies future migrations.

---

# ADR-009 — Validation

## Decision

Every external input must be validated using Zod.

Validation occurs before business logic executes.

No request reaches the database without validation.

## Reason

Validation guarantees consistency and security.

---

# ADR-010 — Forms

## Decision

All forms will use React Hook Form.

Custom form state management is forbidden.

## Reason

Consistency across the application.

---

# ADR-011 — Styling

## Decision

Tailwind CSS is the only styling solution.

CSS-in-JS libraries are forbidden.

Bootstrap is forbidden.

Material UI is forbidden.

## Reason

Consistency and maintainability.

---

# ADR-012 — UI Components

## Decision

The application will use shadcn/ui.

Custom components may extend shadcn components.

Do not replace the component library.

## Reason

Provides accessible and maintainable UI components.

---

# ADR-013 — Icons

## Decision

Lucide will be the only icon library.

No additional icon libraries should be installed.

---

# ADR-014 — State Management

## Decision

Prefer Server Components.

Use Client Components only when necessary.

Do not use Redux.

Do not use MobX.

Do not introduce global state libraries.

React Context may be used only for lightweight UI state.

## Reason

Server-first architecture simplifies the application.

---

# ADR-015 — Communication

## Decision

Prefer Server Actions.

API Routes should only exist when technically necessary.

Do not create unnecessary REST endpoints.

## Reason

Reduces boilerplate and improves security.

---

# ADR-016 — Analytics

## Decision

Analytics must be generated exclusively using SQL queries and deterministic calculations.

Artificial Intelligence is forbidden.

Machine Learning is forbidden.

Prediction models are forbidden.

## Reason

The MVP must have zero operational AI costs.

Every metric must be explainable.

---

# ADR-017 — Current Status

## Decision

Status History is the source of truth.

Current Status is only a cached value.

Current Status must always be synchronised automatically.

Manual synchronisation is forbidden.

## Reason

Prevents inconsistencies while maintaining performance.

---

# ADR-018 — File Storage

## Decision

The MVP will not store CV files.

Only CV metadata will be stored.

Example:

- Backend v1
- Backend v2
- Full Stack
- DevOps

## Reason

Uploading files adds complexity without validating the business idea.

---

# ADR-019 — Third-Party Services

## Decision

The MVP must not depend on paid external services.

Forbidden examples:

- OpenAI
- Anthropic
- Gemini API
- Pinecone
- Algolia
- Redis Cloud
- AWS paid services
- Azure paid services
- Google Cloud paid services

Only free services explicitly approved by the documentation may be used.

---

# ADR-020 — Cost Philosophy

## Decision

Operational costs before monetisation should remain as close as possible to zero.

Every dependency introducing recurring costs must be justified and explicitly approved.

---

# ADR-021 — Data Deletion

## Decision

Business entities should use soft deletes whenever possible.

Historical information affecting analytics must never be permanently removed.

## Reason

Historical consistency is more important than storage optimisation.

---

# ADR-022 — Error Handling

## Decision

Business errors must provide meaningful messages.

Internal server errors should never expose implementation details.

Users should always understand why an operation failed.

---

# ADR-023 — Accessibility

## Decision

Accessibility is mandatory.

All interactive elements must be keyboard accessible.

Semantic HTML should always be preferred.

---

# ADR-024 — Performance

## Decision

Analytics should be calculated inside PostgreSQL whenever possible.

Avoid loading complete datasets into memory.

Avoid unnecessary client-side calculations.

---

# ADR-025 — Testing

## Decision

Business logic must be independently testable.

Architecture decisions should favour testability.

Testing is considered part of the architecture.

---

# ADR-026 — Logging

## Decision

Unexpected errors should be logged.

Sensitive information must never appear in logs.

Authentication tokens must never be logged.

Passwords must never be logged.

---

# ADR-027 — Naming

## Decision

English is the official language of the codebase.

Use English for:

- Variables
- Functions
- Components
- Classes
- APIs
- Tables
- Columns
- Documentation

The UI may later support multiple languages.

The source code will always remain in English.

---

# ADR-028 — Simplicity

## Decision

Whenever multiple valid implementations exist, choose the simplest one.

Avoid unnecessary abstractions.

Avoid overengineering.

Avoid premature optimisation.

---

# ADR-029 — Reusability

## Decision

The architecture should be reusable for future SaaS projects.

Business-specific logic should remain isolated from generic infrastructure whenever possible.

One long-term objective is transforming this project into a reusable SaaS Boilerplate.

---

# Claude Instructions

Treat every Architecture Decision Record in this document as immutable.

Do not replace technologies.

Do not modify architectural patterns.

Do not introduce additional dependencies without approval.

Do not reinterpret documented decisions.

If implementation conflicts with an ADR, stop and request clarification instead of making assumptions.
