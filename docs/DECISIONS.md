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

**Status: Superseded by ADR-031.** Kept below verbatim as the historical record of the MVP's original decision - see ADR-031 for what changed and why.

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

# ADR-030 — Generated Type Boundaries

## Decision

`src/types/supabase.ts` must always be fully generated (`supabase gen types typescript`), never hand-edited.

The generator has two known, structural limitations. Both are handled by adapting the Repository/Service layer that consumes the generated types - never by editing the generated file itself.

**RPC function arguments.** A Postgres function parameter carries no NOT NULL metadata, so the generator always types every `Functions.<name>.Args` field without `| null`, even when the function's own body explicitly accepts and handles a null argument (a plain-typed SQL parameter always accepts null at call time; only the generator's introspection has no way to know that). When a Repository must call such a function with a value that may be null, it declares a local type alias for that function's `Args` next to the call, builds the arguments object normally, and casts it to that alias immediately before the `.rpc(...)` call - with a comment explaining why the cast exists.

**SQL view columns.** The generator conservatively types every column of every view as nullable, since it cannot prove a `count(*) filter (...)` (or any other view expression) is never null the way a table's own NOT NULL constraint would. Repositories backing a view derive their exported types directly from `Database["public"]["Views"][...]["Row"]` (never re-declared by hand), and the pure calculation functions that consume them coalesce nulls to sensible defaults (e.g. `0`) at the point of use.

## Reason

A generated file that is occasionally hand-patched stops being reproducible: the next `supabase gen types` run silently discards the patch, and whatever it fixed regresses with no warning - this is exactly what happened when `src/types/supabase.ts` was hand-maintained instead of generated, and a real schema change went unnoticed until it caused a production error. Keeping "what the generator produces" and "how the app adapts to it" in strictly separate places means regenerating types is always a safe, mechanical, zero-judgment operation, and every place the app's real behaviour diverges from what the generator can express is visible, documented, and version-controlled in application code - not buried inside a file whose entire purpose is to be freely replaceable.

---

# ADR-031 — CV File Storage (Supersedes ADR-018)

## Decision

CV versions may optionally store a real PDF file in Supabase Storage.

ADR-018 ("The MVP will not store CV files. Only CV metadata will be stored.") is superseded by this decision and is no longer current policy. ADR-018 itself is left unmodified as the historical record of what the MVP originally decided and why; this ADR documents what changed and why, rather than editing that record.

The change is additive, not a rewrite of what ADR-018 already established:

- A CV version's name/description-only identity (ADR-018's own examples - "Backend v1," "Full Stack," etc.) is unchanged and still how a CV version is named and compared in Analytics.
- Storage is optional retroactively: CV versions created under ADR-018 remain fully valid with no file attached. Only newly created CV versions require a file going forward - enforced by `CVVersionService` as a business rule (ADR-007), not a database constraint, so existing data needs no migration or backfill.
- Files live in exactly one private Supabase Storage bucket (`cv-files`), never a public bucket. Every download uses a short-lived signed URL, minted only after the caller's ownership of the corresponding CV version row is verified server-side (ADR-005) - never a client-supplied path.

## Reason

ADR-018's original reasoning - "uploading files adds complexity without validating the business idea" - was correct for the MVP's earliest stage, when whether the product itself was worth building was still the open question, and CV *versions* (not CV *files*) were the thing that needed validating. Once real users track multiple CV versions against real applications, being unable to open the actual document undermines the feature this project already committed to: CV Analytics (ANALYTICS_ENGINE.md) ranking "which CV performs better" is far less actionable if the user can't also open the exact file behind those numbers.

The original cost/complexity trade-off no longer holds, either: Supabase Storage is part of the same Supabase Free tier this project already uses for the database and auth (ADR-020 "Cost Philosophy"), so supporting it adds no new vendor and no new recurring cost - only the complexity of a private bucket, an RLS policy scoped the same way every other table's already is, and a signed-URL download path (see `DATABASE.md` "Storage" and `ARCHITECTURE.md` "Repositories").

---

# Claude Instructions

Treat every Architecture Decision Record in this document as immutable.

Do not replace technologies.

Do not modify architectural patterns.

Do not introduce additional dependencies without approval.

Do not reinterpret documented decisions.

If implementation conflicts with an ADR, stop and request clarification instead of making assumptions.
