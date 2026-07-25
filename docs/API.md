# API.md

Version: 1.0

---

# Purpose

This document defines every public operation available in the application.

Although the MVP uses Next.js Server Actions internally, every operation is documented as an API endpoint.

This document acts as the contract between the frontend and the business layer.

All operations must respect the business rules defined in BUSINESS_RULES.md.

---

# General Principles

Every request must:

- Require authentication.
- Validate input using Zod.
- Respect Row Level Security.
- Return meaningful errors.
- Never expose internal implementation details.

---

# Response Format

Successful responses

{
"success": true,
"data": {}
}

---

Failed responses

{
"success": false,
"error": {
"message": "...",
"code": "..."
}
}

---

# Authentication

Authentication is required for every endpoint unless explicitly stated.

Unauthenticated requests must return:

401 Unauthorized

---

# Applications

## Create Application

POST

/applications

Description

Creates a new job application.

Plan-gated (Version 2, Phase 24; limit reduced Phase 31)

Free plan: rejected once the user has 15 active applications (`BUSINESS_RULES.md` "Billing"). Pro plan: unlimited.

Required fields

- company_id
- cv_version_id
- position
- application_date

Optional fields

- job_url
- location
- work_mode
- employment_type
- source
- salary_min
- salary_max
- currency

Returns

Application object.

---

## Get Applications

GET

/applications

Description

Returns all applications belonging to the authenticated user.

Supports filtering.

Supports sorting.

Supports pagination.

Version 2, Phase 26: an `archived` filter returns only soft-deleted applications instead (the Restore view), without the other filters/sorting - a simple, unfiltered, paginated list ordered by most-recently-archived first.

---

Supported Filters

status

company

cv_version

source

employment_type

work_mode

date_from

date_to

---

Supported Sorting

Application Date

Company

Position

Status

Updated At

Ascending

Descending

---

## Get Application

GET

/applications/:id

Returns a single application.

Only if owned by the authenticated user.

---

## Update Application

PATCH

/applications/:id

Updates mutable fields.

Immutable fields

id

user_id

created_at

---

## Delete Application

DELETE

/applications/:id

Soft delete.

Never permanently remove data.

---

## Restore Application

POST

/applications/:id/restore

Version 2, Phase 26.

Reverses a soft delete. No uniqueness or reference-count rule applies (`BUSINESS_RULES.md` "Restore").

Returns the restored application object.

---

# Job Import

Version 2, Phase 32 (Smart Job Import). Plan-gated: every operation below requires the Pro plan (`BUSINESS_RULES.md` "Billing"). A Free plan user receives 403 Forbidden. An alternate way to create an Application (see "Applications" above) - not a separate entity or table.

## Extract Job Data

POST

/job-import/extract

Description

Detects a provider for the given URL and extracts whatever job information that provider can read. This phase ships exactly one provider - the Manual Provider, which always matches and extracts nothing (every field comes back empty except the URL itself) - so the user completes the form manually. Future providers (LinkedIn, InfoJobs, Indeed, Greenhouse, Lever, Workday, Ashby) plug into the same operation without changing its contract.

Required fields

- url

Rejected if

- The URL is empty or not well-formed (400 Validation Error).
- No provider supports the URL (400 Validation Error) - unreachable while the Manual Provider is the only one registered, since it matches every URL.

Returns

Extracted job data: company, position, location, work_mode, employment_type, salary_min, salary_max, currency, job_url, description - every field nullable except job_url.

---

## Confirm Job Import

POST

/job-import/confirm

Description

Creates the application from the (possibly edited) extracted data. The company name is resolved to an existing company or created if none matches (case-insensitive, same uniqueness rule "Companies" above already enforces) - the user never needs to have pre-created it. Subject to the same Free/Pro application-count limit as a normal application creation (`BUSINESS_RULES.md` "Billing") - this endpoint does not bypass it, though it is unreachable on the Free plan since the whole feature is Pro-only.

Required fields

- company (free text)
- cv_version_id
- position

Optional fields

- application_date
- job_url
- location
- work_mode
- employment_type
- source
- salary_min
- salary_max
- currency
- description (has no column on the application itself - stored as the application's first Note)

Returns

Application object.

---

# Application Status

## Update Status

POST

/applications/:id/status

Description

Changes application status.

Creates a new Status History record.

Updates current_status automatically.

Validates allowed transitions.

Returns updated application.

---

## Get Status History

GET

/ applications/:id/status-history

Returns complete status history.

Ordered by changed_at ascending.

---

# Companies

## Create Company

POST

/companies

Required

name

Optional

website

industry

size

country

city

---

## Get Companies

GET

/companies

Returns all companies owned by the authenticated user.

Supports search.

Supports pagination.

Version 2, Phase 26: an `archived` filter returns only soft-deleted companies instead (the Restore view) - mutually exclusive with search, since restoring from a large archive was judged not to need it yet.

---

## Update Company

PATCH

/companies/:id

Updates editable fields.

---

## Delete Company

DELETE

/companies/:id

Soft delete.

Reject deletion if referenced by applications.

---

## Restore Company

POST

/companies/:id/restore

Version 2, Phase 26.

Reverses a soft delete. Rejected if an active company already has the same name (`BUSINESS_RULES.md` "Restore" - the same per-user uniqueness rule Create/Update enforce).

Returns the restored company object.

---

# CV Versions

## Create CV Version

POST

/cv-versions

Required

name

Optional

description

---

## Get CV Versions

GET

/cv-versions

Returns all CV versions.

Version 2, Phase 26: an `archived` filter returns only soft-deleted CV versions instead (the Restore view).

---

## Update CV Version

PATCH

/cv-versions/:id

Updates editable fields.

---

## Delete CV Version

DELETE

/cv-versions/:id

Reject deletion if referenced by applications.

---

## Restore CV Version

POST

/cv-versions/:id/restore

Version 2, Phase 26.

Reverses a soft delete. Rejected if an active CV version already has the same name (`BUSINESS_RULES.md` "Restore" - the same per-user uniqueness rule Create/Update enforce).

Returns the restored CV version object.

---

# Notes

## Create Note

POST

/applications/:id/notes

Creates a note.

Markdown supported.

---

## Get Notes

GET

/applications/:id/notes

Returns all notes.

---

## Update Note

PATCH

/notes/:id

Updates content.

---

## Delete Note

DELETE

/notes/:id

Soft delete.

---

# Interview Feedback

Version 2, Phase 30. Attaches structured feedback to a specific Status History entry, not to the application as a whole.

## Create Feedback

POST

/status-history/:id/feedback

Creates a feedback entry for the given Status History entry.

Required

- notes

Optional

- rating (1-5)
- format (Phone, Video, On-site, Technical, Behavioral)

Rejected if the Status History entry does not belong to an application owned by the authenticated user.

Returns the created feedback object.

---

## Get Feedback

GET

/applications/:id/feedback

Returns every feedback entry across all of the application's Status History entries.

---

## Update Feedback

PATCH

/feedback/:id

Updates rating, format, and/or notes.

---

## Delete Feedback

DELETE

/feedback/:id

Soft delete.

---

# Subscription

Version 2, Phase 31.5 (Pro Plan Foundation), production billing wired in Phase 38. Read-only - backs the Pricing/Plans pages and the Settings "Subscription" section. No endpoint here changes `plan` or `status` directly; that remains the Stripe webhook's job alone (`BUSINESS_RULES.md` "Billing") - `plan` is now actually derived there (Phase 38), not just documented as a future rule.

## Get Subscription

GET

/subscription

Returns the authenticated user's plan, status, renewal date, billing interval, and cancellation date (if the subscription is scheduled to end).

---

## Get Application Usage

GET

/subscription/usage

Returns the count of the user's active (non-archived) applications and the Free plan's limit (`null` for Pro, meaning unlimited). The same count `POST /applications` enforces - never a separate calculation.

---

## Create Checkout Session

POST

/subscription/checkout

Version 2, Phase 38. Creates a real Stripe Checkout Session (mode `subscription`) and redirects the browser to it - implemented as a Server Action (`createCheckoutSessionAction`) that calls Next's `redirect()`, not a JSON-returning endpoint.

Required fields

- interval (`month` | `year`)

Rejected if

- Not authenticated (401 Unauthenticated).
- The user already has an active Pro subscription (400 Validation Error).
- The requested interval's Price ID is not configured (`STRIPE_PRO_MONTHLY_PRICE_ID`/`STRIPE_PRO_YEARLY_PRICE_ID` - see `DEPLOYMENT.md`), or Stripe itself returns an error (500 Internal Error, never exposing the underlying Stripe/network error to the client).

Reuses an already-linked Stripe customer id when one exists (a previously-canceled subscription resubscribing) rather than creating a duplicate Stripe customer.

Returns

Redirects to the Stripe-hosted Checkout page. On completion, Stripe redirects back to `/settings?checkout=success`; on cancellation, `/settings?checkout=cancelled` - neither redirect itself changes any entitlement (the webhook, below, is the only source of truth for that).

---

## Create Billing Portal Session

POST

/subscription/portal

Version 2, Phase 38. Creates a Stripe Customer Portal session and redirects the browser to it - also a Server Action (`createBillingPortalSessionAction`), not a JSON endpoint. The portal itself (Stripe-hosted) is where a user updates their payment method, downloads invoices, and cancels/resumes their subscription - none of those capabilities are reimplemented in this application.

Rejected if

- Not authenticated (401 Unauthenticated).
- The user has no linked Stripe customer yet - i.e. has never completed Checkout (404 Not Found).

Returns

Redirects to the Stripe-hosted Customer Portal. Its own `return_url` points back to `/settings`.

---

# Webhooks

## Stripe Webhook

POST

/api/webhooks/stripe

Version 2, Phase 23 (infrastructure), Phase 38 (production event handling). This application's only Route Handler - every other operation is a Server Action, but Stripe calls this endpoint directly and cannot go through one. Verifies the request's `stripe-signature` header (`STRIPE_WEBHOOK_SECRET`) before processing anything; an invalid signature returns 400 without touching the database. Not called by this application's own frontend - configured entirely on the Stripe side (Dashboard or CLI), see `DEPLOYMENT.md`.

Handled event types

- `checkout.session.completed` - links the Stripe customer to the user (via `client_reference_id`) and syncs the newly created subscription.
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.resumed`
- `customer.subscription.paused`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Every other event type is ignored (not an error - Stripe accounts can have many webhook subscriptions active for features this application doesn't use).

Idempotency

Every event's id is recorded only after it has been fully, successfully processed. A redelivered (duplicate) event is recognized by that id and skipped without reprocessing; a failed attempt is never recorded, so Stripe's automatic retry will process it again.

Returns

`{ "received": true }` on success. 400 for a missing/invalid signature. 500 if processing fails (signals Stripe to retry).

---

# Dashboard

## Dashboard Summary

GET

/dashboard

Returns:

- Total Applications
- Total Interviews
- Total Offers
- Total Rejections
- Current Active Processes

---

## Dashboard Charts

GET

/dashboard/charts

Returns all dashboard chart data.

Includes

Applications per month

Response rate

Interview funnel

Application sources

Company statistics

CV statistics

---

## Dashboard Goals Widget

Version 2, Phase 35. Plan-gated (`BUSINESS_RULES.md` "Billing") independently of the summary/charts above - a Free plan user still sees the rest of the Dashboard, only this one widget shows an upgrade prompt instead of data. Reuses the same computation `GET /goals` performs (see "Goals" below), reshaped into: today's application count, active weekly goals with progress, the most recently unlocked achievements, and upcoming goal deadlines.

---

## Dashboard Notifications Widget

Version 2, Phase 36. Plan-gated (`BUSINESS_RULES.md` "Billing") independently of every other Dashboard section - a Free plan user still sees the rest of the Dashboard, only this widget shows an upgrade prompt instead of data. Reuses the exact same `GET /notifications` computation (see "Notifications" below), reshaped into: the latest few notifications, the unread count, and a "Mark all as read" quick action.

---

# Analytics

## Overview

GET

/analytics

Returns every calculated KPI.

Includes

Response Rate

Interview Rate

Offer Rate

Average Response Time

Average Offer Time

Current Funnel

Most Successful CV

Most Successful Company

Most Successful Source

---

## CV Analytics

GET

/analytics/cv

Returns analytics grouped by CV Version.

---

## Company Analytics

GET

/analytics/companies

Returns analytics grouped by company.

---

## Source Analytics

GET

/analytics/sources

Returns analytics grouped by application source.

---

## Monthly Analytics

GET

/analytics/monthly

Returns monthly evolution.

---

## Funnel Analytics

GET

/analytics/funnel

Returns conversion between every recruitment stage.

---

## Advanced Analytics

Version 2, Phase 33. Plan-gated: requires the Pro plan (`BUSINESS_RULES.md` "Billing"). A Free plan user receives 403 Forbidden. A separate, additional set of analytics - does not replace or change any endpoint above, which remain available to every plan.

GET

/analytics/advanced

Supports filtering

- dateFrom, dateTo
- companyId
- cvVersionId
- workMode
- employmentType
- status

Every filter is optional and combinable. Returns:

- Application Funnel (counts, percentages, conversion rate per stage - same shape as Funnel Analytics above, computed over the filtered set)
- Company Performance (top/worst companies by interview rate, account-wide average response time)
- CV Performance (every CV version compared, sorted by interview rate)
- Timeline Analysis (average days between each consecutive stage; fastest/slowest/median full-process duration)
- Job Search Activity (applications per week, current/longest streak, most/least active month)
- Work Modality comparison
- Employment Type comparison
- Salary (minimum, maximum, average, median, distribution, by company, by work modality) - omitted gracefully wherever no salary data exists
- Personal Insights (deterministic observations only, never speculative)

---

# Calendar

Version 2, Phase 34 (Calendar & Timeline). Plan-gated: every operation below requires the Pro plan (`BUSINESS_RULES.md` "Billing"). A Free plan user receives 403 Forbidden.

## Get Calendar

GET

/calendar

Description

Returns the unified list of calendar events for the user - one entry per real application-status-history transition (Application Submitted, Recruiter Contact, Interview, Technical Interview, Final Interview, Offer Received, Offer Accepted, Offer Rejected, Rejected), plus every Reminder/Custom Event the user has created. Status-derived events are read-only projections of Application Status (see "Application Status" above), never a separate source of truth. Also returns the user's full Status History, Notes, and Interview Feedback in the same response, so the client can render an event's details (including its application's timeline) without further requests.

Supports filtering

- companyId
- eventType (one of the 11 event types above)
- applicationStatus
- dateFrom, dateTo
- workMode
- employmentType
- query (matches company name, position, or note content - applied after every other filter)

Every filter is optional and combinable.

Returns

- events (unified CalendarEvent list, sorted by date ascending)
- history (full Status History, for rendering an event's application timeline)
- notes (full Notes, for rendering an event's application notes)
- feedback (full Interview Feedback, for rendering an event's Interview Feedback inline)

---

## Create Calendar Event

POST

/calendar/events

Description

Creates a Reminder or Custom Event - the only two calendar-event types a user creates directly (every other event type is derived automatically from Application Status and cannot be created here).

Required fields

- type (`reminder` or `custom`)
- title
- eventDate

Optional fields

- description
- applicationId - if given, must belong to an application owned by the user (404 Not Found otherwise)

Returns

Calendar event object.

---

## Update Calendar Event

PATCH

/calendar/events/:id

Same required/optional fields as Create Calendar Event above. Returns 404 Not Found if the event does not exist, is already archived, or does not belong to the user.

Returns

Calendar event object.

---

## Archive Calendar Event

POST

/calendar/events/:id/archive

Soft delete only (`BUSINESS_RULES.md` "Soft Deletes") - no hard DELETE. Returns 404 Not Found if the event does not exist, is already archived, or does not belong to the user. Only Reminder/Custom Events can be archived - status-derived events have no row of their own to archive.

Returns

Archived calendar event object.

---

# Goals

Version 2, Phase 35 (Goals, Achievements & Progress). Plan-gated: every operation below requires the Pro plan (`BUSINESS_RULES.md` "Billing"). A Free plan user receives 403 Forbidden.

## Get Goals

GET

/goals

Description

Returns every goal owned by the user (active, paused, and archived alike), each paired with its live-computed progress (current value, target, remaining, percentage, estimated completion date, current period start/end) - progress is never stored, only ever computed from the same bulk applications/status-history read Analytics/Advanced Analytics/Calendar already use. Also returns: a streak summary (daily/weekly/monthly, current and longest), goal statistics (completed goals, active goals, completion rate, average completion time, longest/current streak), and the full achievement catalog with each entry's unlock state. Achievements are evaluated and unlocked as a side effect of this same call, if newly earned.

Returns

- goals (with progress)
- streaks
- statistics
- achievements (full catalog, locked and unlocked)

---

## Create Goal

POST

/goals

Description

Creates a goal. Only four metrics are supported this phase: `applications`, `interviews`, `offers`, `recruiter_contacts` - a `custom` metric is not yet implemented (the schema is designed to add one later without a breaking change).

Required fields

- metric (`applications` | `interviews` | `offers` | `recruiter_contacts`)
- period (`weekly` | `monthly` | `quarterly` | `yearly` | `total`)
- targetValue (positive whole number)

Optional fields

- title (defaults to e.g. "Applications - Weekly" when omitted)

Returns

Goal object.

---

## Update Goal

PATCH

/goals/:id

Same fields as Create Goal above. Returns 404 Not Found if the goal does not exist or does not belong to the user.

Returns

Goal object.

---

## Pause / Reactivate / Archive Goal

POST

/goals/:id/pause
/goals/:id/reactivate
/goals/:id/archive

Description

Three distinct actions over the same `status` column (`active` | `paused` | `archived`). Archiving is a visible state, not the same thing as deleting - an archived goal is excluded from the active view but still exists and can be reactivated. Returns 404 Not Found if the goal does not exist or does not belong to the user.

Returns

Goal object.

---

## Delete Goal

POST

/goals/:id/delete

Soft delete only (`BUSINESS_RULES.md` "Soft Deletes") - no hard DELETE. Distinct from archiving (see above). Returns 404 Not Found if the goal does not exist, is already deleted, or does not belong to the user.

Returns

Deleted goal object.

---

# Notifications

Version 2, Phase 36 (Notification Center & Smart Reminders). Plan-gated: every operation below requires the Pro plan (`BUSINESS_RULES.md` "Billing"). A Free plan user receives 403 Forbidden.

## Get Notifications

GET

/notifications

Description

Returns every currently-relevant notification, generated live from the user's own applications, status history, calendar events, goals, and achievements - reusing `GET /calendar` and `GET /goals`'s own computation wholesale (no scheduling logic or metric is duplicated). Notification content itself is never stored; only the user's own read/archived/deleted interaction persists, keyed by a deterministic id derived from the underlying condition. Grouped into Today/Yesterday/This Week/Older.

Supports filtering

- unreadOnly
- category (`application` | `interview` | `goal` | `achievement` | `calendar` | `general`)
- applicationId
- companyId
- dateFrom, dateTo
- query (matches title, description, or company name)

Every filter is optional and combinable.

Returns

- groups (notifications grouped by recency)
- unreadCount (computed over the full, unfiltered set)
- totalCount

---

## Mark Notification Read

POST

/notifications/:key/read

Upserts a read state for the given notification key (idempotent - a notification's state row may or may not already exist).

Returns

Success.

---

## Mark All Notifications Read

POST

/notifications/read-all

Marks every currently-unread notification as read in one bulk operation.

Returns

Success.

---

## Archive Notification

POST

/notifications/:key/archive

Sets the notification's status to `archived` - distinct from deleting; an archived notification is excluded from the default grouped view but not removed.

Returns

Success.

---

## Delete Notification

POST

/notifications/:key/delete

Soft delete only (`BUSINESS_RULES.md` "Soft Deletes") - no hard DELETE.

Returns

Success.

---

## Delete All Read Notifications

POST

/notifications/delete-read

Soft-deletes every currently-read notification (never unread or already-archived ones).

Returns

Success.

---

# Search

GET

/search

Global search.

Searches

Companies

Applications

Notes

Supports partial matching.

Case insensitive.

Version 2, Phase 27: supports pagination via `companiesPage`, `applicationsPage`, and `notesPage` - one independent page number per entity, since the three result sets have no natural combined ordering. Defaults to page 1 for each. Backs the dedicated Search page in addition to the Top Navigation dropdown, which continues to request a fixed, small result count per entity (unchanged).

---

# Export

Plan-gated (Version 2, Phase 24): both endpoints below require the Pro plan (`BUSINESS_RULES.md` "Billing"). A Free plan user receives 403 Forbidden.

GET

/export/csv

Exports every application (including archived), denormalized with Company and CV Version names.

CSV is a single flat table, so it does not include standalone Companies, CV Versions, or Notes with no associated application.

---

GET

/export/json

Exports every user-owned entity: Companies, CV Versions, Applications, Status History, and Notes - including archived records.

---

# User

## Profile

GET

/profile

Returns authenticated user profile.

---

PATCH

/profile

Updates editable profile information.

---

# Validation

Every endpoint validates:

Authentication

Authorization

Required fields

Enum values

UUID format

Date format

Business rules

Ownership

---

# Error Codes

400

Validation Error

---

401

Unauthenticated

---

403

Forbidden

---

404

Resource Not Found

---

409

Business Rule Violation

Examples

Duplicate CV name.

Deleting referenced company.

Invalid status transition.

---

500

Unexpected Internal Error

---

# Pagination

Every collection endpoint supports

page

limit

Default

page = 1

limit = 20

Maximum

limit = 100

---

# Security

Never expose internal database identifiers outside the authenticated user's data.

Never return deleted entities.

Never allow cross-user access.

Every endpoint must respect Row Level Security.

---

# Future Endpoints

Reserved for future versions

Browser Extension

LinkedIn Import

Calendar Integration

Notifications

Mobile API

Public API

These endpoints must not be implemented in the MVP.

---

# Claude Instructions

Treat this document as the public contract of the application.

Every implemented operation must match this specification.

Do not create undocumented endpoints.

Do not change endpoint names.

Do not expose internal implementation details.

If an endpoint requires additional behaviour, update this document before implementing it.
