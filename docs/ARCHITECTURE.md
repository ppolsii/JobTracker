# ARCHITECTURE.md

Version: 1.0

---

# Purpose

This document defines the complete software architecture of JobTracker Insights.

Every implementation must follow this architecture.

Architectural consistency is more important than implementation speed.

Claude MUST NOT introduce architectural patterns that are not documented here.

---

# Architecture Goals

The architecture must satisfy the following objectives:

- Easy to understand
- Easy to maintain
- Easy to extend
- Production ready
- Testable
- Type-safe
- Scalable
- Reusable for future SaaS projects

The architecture should favour simplicity over unnecessary abstraction.

---

# High-Level Architecture

The application follows a layered architecture.

```

UI

↓

Server Actions

↓

Services

↓

Repositories

↓

Supabase

↓

PostgreSQL

```

Each layer has a single responsibility.

---

# Layer Responsibilities

## UI Layer

Responsible for:

- Rendering pages
- Rendering components
- User interaction
- Forms
- Client-side validation
- Navigation

The UI layer MUST NOT:

- Access Supabase
- Execute SQL
- Contain business logic

---

## Server Actions

Responsible for:

- Receiving requests
- Authentication
- Calling Services
- Returning responses

Server Actions should remain thin.

Business logic belongs to Services.

---

## Services

Responsible for:

- Business logic
- Validation
- Business rules
- Analytics calculations
- Domain orchestration

Services never render UI.

Services never communicate directly with React Components.

---

## Repositories

Responsible for:

- Database access
- Queries
- Inserts
- Updates
- Deletes

Repositories contain persistence logic only.

Repositories never implement business rules.

---

## Database

Responsible for:

- Data persistence
- Constraints
- Relationships
- Indexes
- RLS

No business logic should depend on database-specific behaviour.

---

# Project Structure

```

src/

app/

features/

shared/

lib/

config/

types/

```

---

# App Directory

Responsible for:

- Routing
- Layouts
- Server Components
- Route groups

Example

```

app/

(auth)/

(dashboard)/

login/

register/

settings/

```

---

# Features Directory

Every business domain lives inside its own feature.

```

features/

applications/

companies/

cv/

dashboard/

analytics/

profile/

settings/

```

Each feature is self-contained.

---

# Feature Structure

Every feature follows exactly the same structure.

```

feature/

components/

actions/

services/

repositories/

hooks/

schemas/

types/

utils/

constants/

```

Every feature owns its implementation.

Cross-feature dependencies should be minimal.

---

# Shared Directory

Contains reusable code.

```

shared/

components/

hooks/

utils/

constants/

validators/

```

Only generic code belongs here.

Business-specific logic is forbidden.

---

# Config Directory

Contains configuration.

Examples:

Environment variables

Application constants

Navigation

Theme

Feature flags

---

# Lib Directory

Contains infrastructure utilities.

Examples:

Supabase client

Authentication helpers

Date utilities

Formatting

Logging

No business logic belongs here.

---

# Types Directory

Contains global shared types.

Feature-specific types belong inside the feature.

---

# Routing

Use Next.js App Router.

Pages should remain small.

Business logic belongs to features.

---

# Component Architecture

Prefer Server Components.

Use Client Components only when required.

Examples:

Forms

Drag & Drop

Dialogs

Interactive charts

Everything else should remain Server Components.

---

# Component Rules

Components should have a single responsibility.

Avoid components larger than approximately 300 lines.

Split large components into smaller reusable components.

---

# Data Flow

The application follows one direction only.

User

↓

UI

↓

Server Action

↓

Service

↓

Repository

↓

Database

↓

Repository

↓

Service

↓

Server Action

↓

UI

Never bypass layers.

---

# Dependency Rules

Allowed

UI

↓

Service

↓

Repository

Forbidden

UI

↓

Repository

Forbidden

Component

↓

Supabase

Forbidden

Repository

↓

Component

Dependencies always point downwards.

---

# State Management

Server state should remain on the server.

Use React state only for UI interactions.

Avoid unnecessary client state.

Do not introduce global state libraries.

---

# Validation

Validation occurs at multiple levels.

Client validation

↓

Server validation

↓

Business validation

↓

Database constraints

Never trust client input.

---

# Error Handling

Every layer handles its own errors.

Repositories

Database errors.

Services

Business errors.

UI

Presentation.

Never expose internal implementation details.

---

# Authentication

Authentication is mandatory.

Authentication should occur before business logic executes.

Unauthenticated requests must never reach Services.

---

# Authorization

Every database query must respect Row Level Security.

Never trust IDs received from the client.

Ownership must always be verified.

---

# Logging

Unexpected errors should be logged.

Business errors should return meaningful messages.

Sensitive information must never appear in logs.

---

# Performance

Prefer database aggregation.

Avoid unnecessary API calls.

Avoid duplicate queries.

Avoid fetching unnecessary columns.

Always paginate large datasets.

---

# Caching

Cache only when necessary.

Do not introduce Redis.

Do not introduce external caching services.

The MVP should rely on PostgreSQL and Next.js caching capabilities.

---

# Security

Always validate input.

Always use parameterised queries.

Never expose secrets.

Never expose Service Role Key.

Never trust browser data.

---

# Scalability

The architecture should support:

- Additional features
- Additional pages
- Additional analytics
- Additional modules

Without requiring major refactoring.

---

# Reusability

The architecture should become the foundation of future SaaS projects.

Business logic must remain isolated from infrastructure.

Reusable code should remain inside shared/.

---

# Coding Philosophy

Prefer explicit code.

Avoid unnecessary abstractions.

Prefer readability over cleverness.

Prefer composition over inheritance.

Keep files small.

Keep responsibilities focused.

---

# Forbidden Practices

Do not query Supabase inside React Components.

Do not place business logic inside UI.

Do not duplicate validation logic.

Do not use global mutable state.

Do not bypass repositories.

Do not bypass services.

Do not install dependencies without approval.

---

# Claude Instructions

Follow this architecture exactly.

Do not invent new layers.

Do not merge responsibilities.

Do not bypass the defined data flow.

Every implementation should fit naturally inside this architecture.

If a feature does not clearly belong to an existing layer, stop and request clarification instead of creating a new architectural pattern.

Architectural consistency is one of the highest priorities of this project.

---

# Business Rule Ownership

Every business rule MUST exist in exactly one Service.

Repositories never decide.

Server Actions never decide.

Components never decide.