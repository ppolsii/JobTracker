# DATABASE.md

Version: 1.0

---

# Purpose

This document defines the complete database design for JobTracker Insights.

The database is the source of truth for the entire application.

Every entity, relationship, constraint and convention must be respected.

Claude MUST NOT modify this schema unless explicitly instructed.

---

# Database Engine

Engine

PostgreSQL

Provider

Supabase

---

# General Principles

The database must be:

- Normalized
- Consistent
- Scalable
- Easy to query
- Easy to maintain

Avoid duplicated information.

Avoid storing calculated values unless required for performance.

---

# Naming Conventions

Tables

snake_case

Examples

applications

companies

cv_versions

---

Columns

snake_case

Examples

created_at

updated_at

company_id

user_id

---

Primary Keys

Every table uses:

id UUID

---

Foreign Keys

Always end with

_id

Example

company_id

user_id

cv_version_id

---

Timestamps

Every business table contains

created_at

updated_at

Both stored in UTC.

---

Soft Delete

Every business table supports

deleted_at

Records should never be permanently deleted unless explicitly required.

---

# UUID Strategy

Every primary key uses UUID.

Never expose sequential identifiers.

---

# Entity Relationship Diagram

Users

↓

Companies

↓

Applications

↓

Status History

↓

Notes

Applications also reference

↓

CV Versions

---

# Tables

The MVP contains the following tables.

users

companies

cv_versions

applications

application_status_history

application_notes

---

# users

Represents authenticated users.

Columns

id

uuid

Primary Key

---

email

text

Unique

Required

---

full_name

text

Required

---

avatar_url

text

Nullable

---

created_at

timestamp

Required

---

updated_at

timestamp

Required

---

deleted_at

timestamp

Nullable

---

# companies

Represents companies where the user applied.

Companies are private.

Each user owns their own company records.

Columns

id

uuid

---

user_id

uuid

FK -> users

---

name

text

Required

---

website

text

Nullable

---

industry

text

Nullable

---

size

text

Nullable

---

country

text

Nullable

---

city

text

Nullable

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

---

Constraints

(user_id, name)

must be unique.

---

# cv_versions

Represents CV variants.

Examples

Backend

Frontend

DevOps

Full Stack

Backend v2

Columns

id

uuid

---

user_id

uuid

---

name

text

Required

---

description

text

Nullable

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

---

Constraints

(user_id, name)

must be unique.

---

# applications

Core table.

Every job application created by the user.

Columns

id

uuid

---

user_id

uuid

---

company_id

uuid

FK -> companies

---

cv_version_id

uuid

FK -> cv_versions

---

position

text

Required

---

job_url

text

Nullable

---

location

text

Nullable

---

work_mode

enum

Remote

Hybrid

On Site

---

employment_type

enum

Full Time

Part Time

Internship

Contract

Freelance

---

source

enum

LinkedIn

Indeed

Referral

Company Website

Recruiter

Other

---

salary_min

integer

Nullable

---

salary_max

integer

Nullable

---

currency

text

Default EUR

---

application_date

date

Required

---

current_status

enum

Cached value.

Automatically updated.

Never manually edited.

---

response_date

date

Nullable

---

offer_salary

integer

Nullable

---

rejection_reason

text

Nullable

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

---

# application_status_history

Stores every status transition.

This table is the source of truth.

Columns

id

uuid

---

application_id

uuid

---

previous_status

enum

Nullable

---

new_status

enum

Required

---

changed_at

timestamp

Required

---

created_by

uuid

FK users

---

Rules

Never update.

Never delete.

Append only.

---

# application_notes

Stores notes attached to applications.

Columns

id

uuid

---

application_id

uuid

---

content

text

Markdown supported.

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

---

# Enums

work_mode

Remote

Hybrid

On Site

---

employment_type

Full Time

Part Time

Internship

Contract

Freelance

---

application_status

Wishlist

Applied

Recruiter Contact

HR Interview

Technical Interview

Final Interview

Offer

Accepted

Rejected

---

application_source

LinkedIn

Indeed

Referral

Company Website

Recruiter

Other

---

# Indexes

Applications

user_id

company_id

application_date

current_status

source

cv_version_id

---

Companies

user_id

name

---

CV Versions

user_id

name

---

Status History

application_id

changed_at

---

# Foreign Keys

companies.user_id

→ users.id

---

cv_versions.user_id

→ users.id

---

applications.user_id

→ users.id

---

applications.company_id

→ companies.id

---

applications.cv_version_id

→ cv_versions.id

---

status_history.application_id

→ applications.id

---

notes.application_id

→ applications.id

---

# Constraints

Application Date

Cannot be in the future.

---

Salary

salary_min

<=

salary_max

---

Application

Must reference an existing company.

Must reference an existing CV version.

---

# Row Level Security

Every table enables RLS.

Policy

Users may only access rows where

user_id

matches

auth.uid()

Tables without user_id should inherit ownership through relationships.

---

# Triggers

updated_at

Automatically updated.

---

Status History

Whenever a new history row is inserted

↓

applications.current_status

is automatically updated.

---

# Functions

Version 2, Phase 20 introduced two Postgres functions (`supabase/migrations/20260720090000_atomic_application_writes.sql`), called via RPC instead of a plain insert/update, purely to guarantee two related writes commit together or not at all. Neither function validates anything or decides any business rule - both run SECURITY INVOKER (the default), so RLS continues to enforce ownership exactly as it does for every other insert/update in this schema.

create_application_with_genesis

Inserts an `applications` row and its genesis `application_status_history` row (previous_status null, new_status Wishlist) in one transaction. Replaces what was previously two separate statements from `ApplicationService.create`.

transition_application_status

Optionally updates `applications.application_date`, then inserts a transition row into `application_status_history`, in one transaction. previous_status is supplied by the caller (`ApplicationStatusService`), not derived here. Replaces what was previously two separate statements from `ApplicationStatusService.changeStatus`.

---

# Views

Version 2, Phase 21 implemented the four views this section previously reserved (`supabase/migrations/20260720100000_analytics_statistics_views.sql`). All four are read-only, `security_invoker` (so RLS on `applications`/`companies`/`cv_versions` applies exactly as it does for any other query against those tables), and perform pure per-status counting via `GROUP BY` - nothing else. Every view enumerates all 9 `application_status` values exhaustively as separate count columns; which statuses mean "interview", "offer" or "response" remains a decision made entirely in application code (`application.constants.ts`), never in these views.

dashboard_metrics

One row per user: a count per status plus `total_count`, across all of that user's non-archived applications. Backs Analytics' Overview (Response/Interview/Offer Rate).

cv_statistics

One row per CV version: the same per-status counts, grouped by `cv_version_id`. Backs CV Analytics.

company_statistics

One row per company: the same per-status counts, grouped by `company_id`. Backs Company Analytics.

monthly_statistics

One row per `YYYY-MM` (from `application_date`): the same per-status counts, grouped by month. Applications with no `application_date` (Wishlist stage) are excluded. Backs Monthly Analytics.

Not covered by a view

Source Analytics (no `source_statistics` name was reserved), Funnel Analytics, Insights, and every grouping's Average Response Time remain computed in `AnalyticsService`/`analytics-calculations.ts` from the existing bulk applications/status-history reads - see `CHANGELOG.md` Phase 21 for why.

---

# Backup Strategy

Handled by Supabase.

No application-level backup logic required.

---

# Migration Strategy

Every schema modification must be implemented through migrations.

Manual database changes are forbidden.

---

# Future Compatibility

The schema should support future additions without breaking changes.

Examples

Interview feedback

Salary negotiation

Recruiter contacts

Attachments

Browser Extension

Calendar Integration

These features should require only new tables.

Not modifications to existing ones.

---

# Claude Instructions

Do not modify table names.

Do not rename columns.

Do not remove relationships.

Do not denormalize the database.

Do not introduce duplicated data.

Do not store analytics inside the database.

Analytics should always be calculated from historical information.

Every migration must preserve backwards compatibility whenever possible.
