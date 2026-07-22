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

Plan-gated (Version 2, Phase 24)

Free plan: rejected once the user has 25 active applications (`BUSINESS_RULES.md` "Billing"). Pro plan: unlimited.

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

Interview Feedback

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
