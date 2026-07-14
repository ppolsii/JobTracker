# FEATURES.md

Version: 1.0

---

# Purpose

This document defines every functional feature included in the MVP.

Each feature contains its objective, expected behaviour, validations and acceptance criteria.

Only features documented here should be implemented.

Any undocumented feature is considered out of scope.

---

# Feature List

The MVP consists of the following features:

- Authentication
- User Profile
- Company Management
- CV Version Management
- Application Management
- Application Status Tracking
- Dashboard
- Analytics
- Search
- Filtering
- Notes
- Export
- Settings

---

# Feature 1 - Authentication

## Objective

Allow users to securely access their personal workspace.

## Description

Authentication is handled using Supabase Auth.

Users must register using email and password.

Unauthenticated users cannot access any application data.

## Functional Requirements

- Register
- Login
- Logout
- Password reset
- Session persistence

## Validation

- Email must be valid.
- Password must satisfy minimum security requirements.

## Acceptance Criteria

- User can register.
- User can log in.
- User session persists after refresh.
- Protected routes require authentication.

---

# Feature 2 - User Profile

## Objective

Allow users to manage their personal information.

## Editable Fields

- Full Name

Future versions may support avatars.

## Acceptance Criteria

- User can edit profile.
- Changes persist.

---

# Feature 3 - Company Management

## Objective

Store companies associated with applications.

## Functional Requirements

Create company.

Edit company.

Archive company.

Search companies.

List companies.

## Validation

Company name is required.

Duplicate company names are not allowed for the same user.

## Acceptance Criteria

Users can manage their own companies.

---

# Feature 4 - CV Version Management

## Objective

Track which CV version was used for every application.

## Functional Requirements

Create CV version.

Rename CV version.

Archive CV version.

List CV versions.

## Validation

CV names must be unique per user.

CVs currently referenced by applications cannot be deleted.

## Acceptance Criteria

Users can associate applications with CV versions.

---

# Feature 5 - Job Applications

## Objective

Register every submitted job application.

## Required Fields

Company

Position

CV Version

Application Date

## Optional Fields

Location

Job URL

Employment Type

Work Mode

Salary Range

Application Source

Notes

## Functional Requirements

Create.

Read.

Update.

Archive.

Duplicate.

Search.

Filter.

Sort.

## Acceptance Criteria

Users can completely manage their application history.

---

# Feature 6 - Status Tracking

## Objective

Track the evolution of every application.

## Workflow

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

## Behaviour

Every status transition creates a Status History record.

Status history is immutable.

## Acceptance Criteria

History always reflects every transition.

---

# Feature 7 - Dashboard

## Objective

Provide a quick overview of the user's job search.

## KPI Cards

Total Applications

Active Applications

Interviews

Offers

Rejected

Current Success Rate

## Charts

Applications per Month

Response Rate

Application Sources

Current Funnel

Response Time

## Acceptance Criteria

Dashboard updates automatically after every data change.

---

# Feature 8 - Analytics

## Objective

Help users understand and improve their strategy.

## Analytics Included

Response Rate

Interview Rate

Offer Rate

Average Response Time

Average Offer Time

Applications by Source

Applications by Company

Applications by CV Version

Monthly Evolution

Current Funnel

Most Successful CV

Most Successful Source

Most Successful Company

## Acceptance Criteria

Every metric is generated from historical data.

No AI.

No predictions.

No estimations.

---

# Feature 9 - Search

## Objective

Quickly locate information.

## Search Targets

Applications

Companies

Notes

## Behaviour

Case insensitive.

Partial matching.

Instant results.

---

# Feature 10 - Filtering

## Supported Filters

Status

Company

CV Version

Source

Work Mode

Employment Type

Date Range

Salary Range

Filters must be combinable.

---

# Feature 11 - Notes

## Objective

Store relevant information for every application.

## Behaviour

Markdown supported.

Unlimited notes.

Notes belong to one application.

## Acceptance Criteria

Users can create, edit and archive notes.

---

# Feature 12 - Export

## Objective

Allow users to export their own data.

## Supported Formats

CSV

JSON

## Acceptance Criteria

Export contains every user-owned entity.

---

# Feature 13 - Settings

## Objective

Configure application preferences.

## MVP Settings

Theme

Account

Danger Zone

Future versions may include additional settings.

---

# Common Functional Requirements

Every feature must:

Respect authentication.

Respect ownership.

Respect business rules.

Respect Row Level Security.

Validate every input.

Return meaningful errors.

Support responsive layouts.

Support dark mode.

---

# Non Functional Requirements

Loading time below 500ms where possible.

Accessible UI.

Responsive design.

Type-safe implementation.

Secure by default.

Maintainable architecture.

Reusable components.

---

# Excluded Features

The following are intentionally excluded from the MVP.

AI

Interview simulator

CV optimization

Cover Letter Generator

LinkedIn Import

Browser Extension

Calendar Synchronisation

Notifications

Recruiter CRM

Public API

Mobile Application

Gamification

Social Features

---

# Future Features

The current architecture should support future implementation of:

Interview Feedback

Recruiter Contacts

Attachments

Browser Extension

Salary Tracking

Calendar Integration

Job Offer Comparison

Public API

Native Mobile App

AI Assistant

These features must not be implemented now.

---

# Definition of Done

The MVP is complete when a user can:

Register.

Login.

Create Companies.

Create CV Versions.

Register Applications.

Track Application Status.

Write Notes.

View Dashboard.

View Analytics.

Search.

Filter.

Export Data.

Use the application on desktop and mobile.

Without any undocumented functionality.

---

# Claude Instructions

Implement only the features described in this document.

Do not add additional features.

Do not simplify business workflows.

Do not remove validations.

If a requested implementation is not described here, stop and request clarification.

Every feature must reinforce the value proposition described in VALUE_PROPOSITION.md.

The objective is not to build a tracker.

The objective is to build an analytics platform whose data source is the application history.
