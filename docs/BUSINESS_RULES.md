# BUSINESS_RULES.md

Version: 1.0

---

# Purpose

This document defines every business rule of JobTracker Insights.

These rules are mandatory.

Claude MUST implement the application respecting these rules.

If implementation conflicts with these rules, this document takes precedence.

---

# General Principles

The application is single-tenant.

Every user owns their own data.

No information is shared between users.

Analytics are always calculated using only the owner's data.

The application never compares users.

There is no global ranking.

---

# User Ownership

Every entity belongs to exactly one user.

Tables affected:

- Applications
- Companies
- CV Versions
- Notes
- Status History

A user can NEVER access another user's information.

All database access must be protected through Row Level Security (RLS).

---

# Authentication

Authentication is mandatory.

Anonymous users cannot use the application.

Authentication is handled only through Supabase Auth.

Passwords are never stored by the application.

JWT tokens are managed by Supabase.

---

# Application Lifecycle

Every application follows a lifecycle.

The lifecycle is immutable.

Allowed states:

Wishlist

↓

Applied

↓

Recruiter Contact

↓

HR Interview

↓

Technical Interview

↓

Final Interview

↓

Offer

↓

Accepted

or

Rejected

---

# Allowed State Transitions

Valid transitions:

Wishlist
→ Applied

Applied
→ Recruiter Contact

Recruiter Contact
→ HR Interview

HR Interview
→ Technical Interview

Technical Interview
→ Final Interview

Final Interview
→ Offer

Offer
→ Accepted

Offer
→ Rejected

Recruiter Contact
→ Rejected

HR Interview
→ Rejected

Technical Interview
→ Rejected

Final Interview
→ Rejected

Applied
→ Rejected

---

Invalid examples

Accepted
→ Applied

Rejected
→ Technical Interview

Wishlist
→ Offer

Offer
→ HR Interview

These transitions MUST be rejected.

---

# Status History

Every status change must generate a history record.

The history cannot be modified.

The history cannot be deleted.

History is append-only.

Each record contains:

Application ID

Previous Status

New Status

Timestamp

User ID

---

# Applications

Every application must belong to:

One user.

One company.

One CV version.

Applications cannot exist without these relationships.

---

# Required Fields

Company

Position

Application Date

Current Status

CV Version

Everything else is optional.

---

# Company Rules

Companies are unique per user.

Example

User A

Google

User B

Google

These are different records.

Companies are never global.

---

A company cannot be deleted if applications reference it.

Possible approaches:

Soft delete

or

Prevent deletion.

Prefer preventing deletion.

---

# CV Rules

Users may create multiple CV versions.

Examples

Backend v1

Backend v2

Frontend

Full Stack

DevOps

Every application references exactly one CV version.

A CV version cannot be deleted while applications reference it.

---

# Duplicate Applications

Users may apply multiple times to the same company.

Different positions are allowed.

Different dates are allowed.

Different CV versions are allowed.

Therefore duplicates are allowed.

---

# Analytics Rules

Analytics are always generated from historical data.

Never estimate.

Never predict.

Never invent information.

Only calculate using stored records.

---

Example

GOOD

Response Rate

Responses

/

Applications

BAD

"This company usually likes backend developers."

Unless supported by user data.

---

# Dashboard Rules

Dashboard data must always be real-time.

Every application change should immediately affect:

KPIs

Charts

Analytics

No nightly jobs.

No delayed calculations.

---

# Notes

Applications may contain notes.

Notes belong to exactly one application.

Markdown is supported.

Rich text is not.

---

# Soft Deletes

No business entity should be physically deleted.

Applications

Companies

CV Versions

Should use:

deleted_at timestamp

instead of DELETE.

This preserves analytics consistency.

---

# Restore (Version 2, Phase 26)

Every soft-deleted entity above may be restored (deleted_at set back to null).

Restoring a Company or CV Version must re-validate the same per-user uniqueness rule create/update already enforce. Restoring "Google" must fail if a different, currently active company named "Google" now exists - the same partial unique index create/update rely on is the actual enforcement; restore is not a special case that bypasses it.

Applications have no uniqueness rule and no reference-count rule to re-validate on restore (see "Duplicate Applications" above) - restoring an application is unconditional once ownership is confirmed.

Restoring never re-writes history. Status History, Notes, and every other historical record remain exactly as they were - restore only reverses the one field (deleted_at) that soft-delete itself set.

# Time

All timestamps stored in UTC.

Displayed using user's local timezone.

---

# Date Handling

Application Date

Represents when the application was submitted.

Status timestamps

Represent when each stage occurred.

These dates must never be inferred.

---

# Metrics Integrity

Changing historical information changes analytics.

Therefore:

Editing dates should require confirmation.

Deleting applications should require confirmation.

Deleting historical records is forbidden.

---

# User Permissions

Users may

Create

Read

Update

Soft Delete

their own entities.

Users may never

Access other users.

Modify analytics manually.

Modify history.

Bypass workflow.

---

# Business Constraints

Applications must always have:

Exactly one company.

Exactly one CV.

Exactly one current status.

Exactly one owner.

---

Companies may have

Zero or many applications.

---

CV Versions may have

Zero or many applications.

---

Status History may have

One or many records per application.

---

# Search

Search only returns user owned data.

Search must be case insensitive.

Search must support partial matching.

Search fields

Company

Position

Notes

Tags (future)

---

# Filtering

Supported filters

Status

Company

CV Version

Source

Work Mode

Application Date

Salary Range

---

Filters must be combinable.

Example

Status = Technical Interview

AND

Work Mode = Remote

AND

CV = Backend v2

---

# Sorting

Applications can be sorted by

Application Date

Company

Position

Current Status

Last Updated

Response Time

Ascending

Descending

---

# Export

Users own their data.

Users must be able to export all their information, including archived (soft-deleted) records - soft delete never actually erases data.

JSON exports every user-owned entity.

CSV exports a single flat table of Applications, denormalized with Company and CV Version names.

Preferred formats

CSV

JSON

PDF belongs to future versions.

---

# Performance Rules

Analytics must be calculated efficiently.

Avoid loading all applications into memory.

Prefer SQL aggregation.

Avoid client-side calculations whenever possible.

---

# Security Rules

Never trust client input.

Validate every request.

Validate every UUID.

Validate every enum.

Validate every date.

Never expose internal IDs unnecessarily.

Never expose Service Role Key.

---

# Error Handling

Business errors should return meaningful messages.

Example

GOOD

"This CV version is currently used by 14 applications."

BAD

"500 Internal Server Error"

---

# Auditability

Important operations should be auditable.

Status changes

Application deletion

Company deletion attempts

CV deletion attempts

Should be logged.

---

# Future Compatibility

The current data model must support future additions.

Examples

Interview feedback

Salary tracking

Browser Extension

Google Calendar

LinkedIn Import

Without requiring breaking schema changes.

---

# Billing (Version 2, Phase 23 data model; Phase 24 enforcement)

The application supports a Free and a Pro plan (`VALUE_PROPOSITION.md` "Free Plan"/"Pro Plan").

Every user has exactly one subscription record.

A user is created with plan `free` by default.

A user may never set their own plan or subscription status directly. This is not a temporary limitation - it must remain true regardless of how many features are gated.

Subscription status is a mirror of the payment provider's own state. The application must never invent or infer a status.

Downgrading, cancelling, or a failed payment must never delete historical data (Applications, Companies, CV Versions, Notes). Plan changes affect access going forward only, never past records - consistent with this document's general soft-delete/history-preservation principle.

A user is on the Pro plan when, and only when, their subscription's `plan` column is `pro`. `status` (Stripe's own subscription status, mirrored as-is per Phase 23) is not itself consulted for this decision - nothing sets `plan` to `pro` yet (Checkout does not exist - `IMPLEMENTATION_ORDER_V2.md` Phase 24 explicitly excludes it), so this rule is currently unreachable for every user. It is documented now so the eventual Checkout implementation has one clear, already-agreed rule to satisfy, rather than inventing one at that point.

---

## Enforced Limits (Version 2, Phase 24)

Every entitlement decision below is made in exactly one place, `BillingService`, per `ARCHITECTURE.md`'s Business Rule Ownership. No other Service, Repository, or Server Action decides these rules or inspects `plan` itself.

### Application Limit

Free plan: a maximum of 25 active (non-archived) applications.

Pro plan: unlimited applications.

Archiving an application frees a slot - the limit counts currently active applications, not lifetime history, consistent with this document's general soft-delete philosophy (soft-deleted records still exist, but are no longer "active").

Attempting to create an application while at the limit must be rejected with a clear, specific message naming the limit - never a generic error (see this document's own "Error Handling" section).

### Export

Export (CSV and JSON) requires the Pro plan.

---

## Not Yet Enforced

`VALUE_PROPOSITION.md` also names "Historical trends," "Advanced analytics," "Advanced filtering," and "Advanced insights" as Pro-only. None of these has a documented basic/advanced split - the current Analytics/Filtering features are not divided into tiers anywhere in this document, `FEATURES.md`, or `UI_SYSTEM.md`. Inventing such a split without an explicit product decision would violate this document's "Claude Instructions" ("Never bypass business rules... never create hidden shortcuts" - applies equally to inventing rules that were never actually decided). A future phase must define the specific split before it can be enforced.

---

# Claude Instructions

Treat this document as immutable.

Never bypass business rules.

Never simplify workflow.

Never create hidden shortcuts.

Never automatically fix invalid data.

Reject invalid operations.

Preserve data integrity above user convenience.

Whenever two implementations are possible:

Choose the one that better preserves historical information.

Never delete information if soft delete is possible.

Business rules are more important than implementation simplicity.
