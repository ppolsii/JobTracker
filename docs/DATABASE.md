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

file_path

text

Nullable

Version 2, Phase 40 (CV Library). The object key inside the private `cv-files` Supabase Storage bucket - always `"<user_id>/<id>.pdf"`, generated server-side, never supplied by the client. Nullable because every CV version created before this phase has no file yet; those rows remain fully valid (all existing relationships unchanged), just without a downloadable file until re-uploaded.

---

file_name

text

Nullable

Version 2, Phase 40. The original uploaded filename (e.g. "Backend_Resume_2026.pdf"), shown in the CV Library and used as the downloaded file's name.

---

file_size

bigint

Nullable

Version 2, Phase 40. Bytes, as reported by the upload. Capped at 5 MB by both the storage bucket's own `file_size_limit` and `CVVersionService`'s `validateCVFile` (see ARCHITECTURE.md "Business Rule Ownership" - the same rule is enforced in exactly one Service, the bucket limit is defense in depth only).

---

uploaded_at

timestamp

Nullable

Version 2, Phase 40. Set whenever a file is uploaded or replaced - distinct from `updated_at`, which also changes on a metadata-only edit (name/description) that doesn't touch the file.

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

# Storage

Version 2, Phase 40 (CV Library): supersedes this document's previous statement that "the MVP does not require file uploads" (see DEPLOYMENT.md's own updated "File Storage" section for the full setup). One private Supabase Storage bucket, `cv-files`, holds every user's CV PDFs.

Bucket

cv-files (private, not public)

Object key

`<user_id>/<cv_version_id>.pdf` - always derived server-side, never client-supplied

Access

No public URL. Every download goes through a signed URL (`CVVersionService.getDownloadUrl`), minted only after the caller's ownership of that CV version row is verified - the same "never trust the client, verify ownership" rule this document's RLS policies already enforce for every table.

RLS

`storage.objects` has one policy scoped to `bucket_id = 'cv-files'`, requiring the object key's leading path segment to equal `auth.uid()` - functionally identical to every table's own `user_id = auth.uid()` policy, just expressed against Storage instead of a table.

Constraints

PDF only (`application/pdf`), 5 MB maximum - enforced by the bucket's own `file_size_limit`/`allowed_mime_types` and, independently, by `CVVersionService.create`/`update` before ever calling Storage.

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

Permanent Deletion (product decision, post-Phase 40; migrations `20260727090000_application_hard_delete.sql` and `20260727100000_application_hard_delete_cascade_fix.sql`)

`applications` is the only table in this schema with a DELETE grant/RLS policy - every other table has none (see this document's own soft-delete convention). The policy enforces ownership only (`user_id = auth.uid()`), matching every other policy on this table exactly; "only an already-archived application may be deleted" is a business rule enforced by `ApplicationService.deletePermanently`, not expressed in SQL - see `BUSINESS_RULES.md` "Permanent Deletion" and `DECISIONS.md` "ADR-032."

Deleting a row here cascades (via each table's own FK) to `application_status_history`, `application_notes`, `calendar_events`, and, transitively through status history, `interview_feedback`.

The deletion itself must go through the `delete_application_permanently(p_user_id, p_application_id)` function (`ApplicationRepository.hardDelete`'s only caller) rather than a plain `DELETE` statement. Bug fix: `application_status_history` has had a `BEFORE DELETE` trigger since Phase 3 (`prevent_status_history_delete`) that unconditionally rejects any deletion of its rows - including ones caused by this cascade, since Postgres triggers fire on cascade-induced deletes the same as direct ones. `delete_application_permanently` sets a transaction-scoped flag (`set_config('app.cascading_application_delete', 'on', true)`) that the trigger checks and allows through only for `TG_OP = 'DELETE'` - a direct attempt to delete a status-history row still hits the original exception exactly as before; only this one, authorized cascade path is exempted.

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

# Version 2 Tables

Tables introduced after the MVP. Documented separately so the "Tables"/"Foreign Keys" sections above remain an accurate record of what the MVP itself contained.

# subscriptions

Version 2, Phase 23 (`IMPLEMENTATION_ORDER_V2.md`) established this table as infrastructure only. Phase 38 (Production Billing) is what actually writes `plan`/`status`/`billing_interval`/`cancel_at`/`latest_invoice_id` beyond their defaults, via the Stripe webhook - see `BillingWebhookService`. Every user still has exactly one row, created automatically at signup (`handle_new_user`).

Columns

id

uuid

Primary Key

---

user_id

uuid

FK -> users

Unique - exactly one subscription row per user.

---

plan

enum (`subscription_plan`)

Required. Default `free`. Derived from Stripe's own subscription `status` by `BillingWebhookService` (`trialing`/`active`/`past_due` -> `pro`; every other status -> `free`) - the only place this derivation happens (`BUSINESS_RULES.md` "Billing").

---

status

enum (`subscription_status`)

Nullable. Mirrors Stripe's own `Subscription.status` values as-is - never reinterpreted.

---

stripe_customer_id

text

Nullable. Unique. First linked to this row by `checkout.session.completed` (via the Checkout Session's `client_reference_id`, set to this user's id when the session was created) - see `BillingWebhookRepository.linkStripeCustomer`.

---

stripe_subscription_id

text

Nullable. Unique.

---

current_period_end

timestamp

Nullable. The "Renewal Date" - read from the subscription's first item (`items.data[0].current_period_end`, Stripe's current API shape).

---

billing_interval

enum (`subscription_billing_interval`)

Nullable. Version 2, Phase 38. Mirrors the subscribed price's own `recurring.interval` (`month` or `year`) - the two intervals this application actually sells (Pro Monthly/Pro Yearly).

---

cancel_at

timestamp

Nullable. Version 2, Phase 38. The "Cancellation Date" - Stripe's `cancel_at` (scheduled-to-cancel) if set, else `canceled_at` (already ended) if set, else null. A non-null value with `status` still `active`/`trialing`/`past_due` means the subscription is scheduled to end on this date but hasn't yet (the Subscription section's UI shows this as "Ends on" instead of "Renewal date").

---

latest_invoice_id

text

Nullable. Version 2, Phase 38. Set by `invoice.payment_succeeded`/`invoice.payment_failed` (and refreshed by every subscription sync, which also carries the subscription's own `latest_invoice`) - kept for reference/support, not for any entitlement decision (that stays `status`/`plan` alone, "never duplicate data already managed elsewhere").

---

created_at

timestamp

---

updated_at

timestamp

Constraints

`(user_id)`, `(stripe_customer_id)`, `(stripe_subscription_id)` are each unique.

Row Level Security

Users may only `select` their own row (`user_id = auth.uid()`). No `insert`/`update`/`delete` policy or grant exists for `authenticated` - a user must never be able to set their own plan/status directly. The only writers are the `handle_new_user` trigger (the genesis row) and the billing webhook (`app/api/webhooks/stripe`), which uses the Supabase service-role client - see `ARCHITECTURE.md` "Repositories" for why an authenticated-user RLS policy could not safely allow that write instead.

---

# stripe_webhook_events

Version 2, Phase 38 (Production Billing) - a webhook idempotency log ("WEBHOOKS": "All webhook handlers must be idempotent"). Holds no user data; only the Supabase service-role client (via `BillingWebhookRepository`) ever reads or writes it.

Columns

id

text

Primary Key. The Stripe event's own `id` (e.g. `evt_...`) - its uniqueness is what makes a duplicate delivery detectable.

---

type

text

The Stripe event type (e.g. `customer.subscription.updated`) - kept for debugging/audit only.

---

created_at

timestamp

When this event was recorded - always *after* it was fully, successfully processed (never before), so a failed attempt is never mistaken for an already-handled duplicate and remains retryable on Stripe's next delivery.

Row Level Security

Enabled, with no policy and no grant to `authenticated` - this table is never read or written by anything except the service-role client.

---

# interview_feedback

Version 2, Phase 30 (`IMPLEMENTATION_ORDER_V2.md`) - attaches structured feedback to a specific `application_status_history` row.

Unlike `application_notes`, this table has its own `user_id` column (the same shape `applications`/`companies`/`cv_versions` already use), so RLS and `InterviewFeedbackRepository` both filter on it directly. Ownership is still inherited through Status History too: the insert/update RLS policies additionally require the referenced `application_status_history` row to belong to an application owned by that same user.

Columns

id

uuid

---

application_status_history_id

uuid

FK application_status_history

---

user_id

uuid

FK users

---

rating

integer

Nullable. 1-5.

---

format

enum (`interview_format`)

Nullable.

---

notes

text

Required. Markdown supported, matching `application_notes.content`.

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

Row Level Security

Users may `select`/`insert`/`update` rows where `user_id = auth.uid()`. `insert`/`update` additionally require the target `application_status_history_id` to belong to an application owned by that same user. No `delete` policy or grant exists - soft delete only (`deleted_at`), matching every other business entity.

---

# calendar_events

Version 2, Phase 34 (`IMPLEMENTATION_ORDER_V2.md`) - stores only the two user-created Calendar event types (Reminder, Custom Event). Every other Calendar event type (Application Submitted, Recruiter Contact, Interview, Technical Interview, Final Interview, Offer Received, Offer Accepted, Offer Rejected, Rejected) is derived at read time from `application_status_history` and has no row here.

Same hybrid-ownership shape as `interview_feedback`: its own `user_id` column, so RLS and `CalendarEventRepository` both filter on it directly, plus an ownership check on the optional `application_id` link.

Columns

id

uuid

---

user_id

uuid

FK users

---

application_id

uuid

Nullable. FK applications. A Reminder/Custom Event need not be tied to an application.

---

type

enum (`calendar_event_type`)

---

title

text

Required.

---

description

text

Nullable.

---

event_date

date

Required.

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

Row Level Security

Users may `select`/`insert`/`update` rows where `user_id = auth.uid()`. `insert`/`update` additionally require that, when `application_id` is set, it belongs to an application owned by that same user (`application_id is null or exists (...)`). No `delete` policy or grant exists - soft delete only (`deleted_at`), matching every other business entity.

---

# goals

Version 2, Phase 35 (`IMPLEMENTATION_ORDER_V2.md`) - a user-defined target (e.g. "5 applications per week"). Progress itself is never stored here - `GoalService` always computes it live from `applications`/`application_status_history`, the same bulk data Analytics/Advanced Analytics/Calendar already read. Only the goal's own definition and status persist.

Columns

id

uuid

---

user_id

uuid

FK users

---

metric

enum (`goal_metric`)

One of `applications`, `interviews`, `offers`, `recruiter_contacts`. A future `custom` metric is deliberately not included this phase (`ALTER TYPE ... ADD VALUE` later, no restructuring needed).

---

period

enum (`goal_period`)

One of `weekly`, `monthly`, `quarterly`, `yearly` (each recurs - progress resets every new period) or `total` (cumulative, never resets).

---

target_value

integer

Required. Must be greater than zero (`goals_target_value_positive` check constraint).

---

title

text

Nullable. Falls back to a derived label (e.g. "Applications - Weekly") in the application layer when absent.

---

status

enum (`goal_status`)

Default `active`. One of `active`, `paused`, `archived`.

---

completed_at

timestamp

Nullable. Only ever set for `period = 'total'` goals, once, the first time their cumulative progress reaches `target_value` - a recurring goal's periods reset forever and so never set this column.

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

Row Level Security

Users may `select`/`insert`/`update` rows where `user_id = auth.uid()`. No `delete` policy or grant exists - "Delete" (the user-facing action) is a soft delete via `deleted_at`, distinct from `status = 'archived'` (still a real, selectable row) - the two are deliberately different operations.

---

# user_achievements

Version 2, Phase 35 - a permanent, append-only unlock log. Achievements themselves (key, label, description, unlock condition) are defined in code (`goal.constants.ts`'s `ACHIEVEMENT_DEFINITIONS`/`achievement-calculations.ts`), never in the database - this table only records *that* a given user unlocked a given key, and *when*.

Columns

id

uuid

---

user_id

uuid

FK users

---

achievement_key

text

Matches an `ACHIEVEMENT_DEFINITIONS` key - not a FK, since the catalog lives in code, not a database table.

---

unlocked_at

timestamp

Row Level Security

Users may `select`/`insert` rows where `user_id = auth.uid()`. No `update`/`delete` policy or grant exists - achievements unlock automatically and permanently; there is no action that edits or revokes one. A `unique (user_id, achievement_key)` constraint makes a duplicate unlock attempt fail safely (23505), which `AchievementService` treats as "already unlocked," not an error.

---

# notification_states

Version 2, Phase 36 (`IMPLEMENTATION_ORDER_V2.md`) - Notification Center & Smart Reminders. Notification *content* is never stored: every notification (stale application, interview reminder, goal progress, achievement unlock, calendar event) is generated live, on every read, by `NotificationService` from data this application already has (reusing `CalendarService`/`GoalService`/`AchievementService` wholesale). This table only records a user's own interaction - read, archived, or deleted - with a given, deterministically-keyed notification, so regenerating the list on every page load never creates duplicate state and always reattaches the right one.

Columns

id

uuid

---

user_id

uuid

FK users

---

notification_key

text

A deterministic string derived entirely from the underlying condition (e.g. `application:no_activity:<application_id>`, `achievement:unlocked:<achievement_key>`) - never a random id, so the same logical notification always maps to the same key across regenerations. Not a FK - the notification catalog lives in code (`notification-calculations.ts`), not a database table.

---

status

enum (`notification_status`)

Default `unread`. One of `unread`, `read`, `archived`.

---

created_at

timestamp

---

updated_at

timestamp

---

deleted_at

timestamp

The authoritative "deleted" marker - orthogonal to `status` (a deleted row's `status` column is left untouched, whatever it was). `NotificationRepository.listStatesForUser` must return rows regardless of `deleted_at` - notification content is regenerated fresh on every read (see above), so a row excluded here would lose its deleted state on the very next read and the notification would silently reappear as "unread." `mergeNotificationState` is what actually derives the app-level `"deleted"` status from this column being set.

Row Level Security

Users may `select`/`insert`/`update` rows where `user_id = auth.uid()`. No `delete` policy or grant exists - "Delete notification"/"Delete all read" are soft deletes via `deleted_at` (BUSINESS_RULES.md "Soft Deletes"), matching every other business entity; "Archive notification" is the distinct `status = 'archived'` value `update` already handles. A `unique (user_id, notification_key)` constraint makes every write an idempotent upsert.

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

subscription_plan (Version 2, Phase 23)

free

pro

---

subscription_billing_interval (Version 2, Phase 38)

month

year

---

subscription_status (Version 2, Phase 23)

Mirrors Stripe's own `Subscription.status` values exactly.

incomplete

incomplete_expired

trialing

active

past_due

canceled

unpaid

paused

---

interview_format (Version 2, Phase 30)

Phone

Video

On-site

Technical

Behavioral

---

calendar_event_type (Version 2, Phase 34)

reminder

custom

---

goal_metric (Version 2, Phase 35)

applications

interviews

offers

recruiter_contacts

---

goal_period (Version 2, Phase 35)

weekly

monthly

quarterly

yearly

total

---

goal_status (Version 2, Phase 35)

active

paused

archived

---

notification_status (Version 2, Phase 36)

unread

read

archived

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
