# UI_SYSTEM.md

Version: 1.0

---

# Purpose

This document defines the complete User Interface System of JobTracker Insights.

Every page, component and interaction must follow these guidelines.

Visual consistency is mandatory.

The objective is to build a modern SaaS interface that is simple, fast and focused on usability.

---

# Design Philosophy

The interface should feel:

- Clean
- Modern
- Professional
- Minimalistic
- Fast
- Data-focused

The user should always understand where they are and what action to take next.

Avoid visual clutter.

Avoid unnecessary animations.

Avoid decorative elements.

---

# General Principles

Every screen should prioritise:

- Readability
- White space
- Simplicity
- Accessibility
- Consistency

Every page should expose only the information required for that task.

---

# Color Palette

Primary

Blue

Secondary

Slate

Success

Green

Warning

Amber

Danger

Red

Background

Neutral

The exact Tailwind palette may be chosen during implementation.

---

# Theme

Dark Mode

Required.

Light Mode

Required.

Theme selection should persist between sessions.

---

# Typography

Font

Inter

Fallback

System Sans

Hierarchy

H1

Page title

H2

Section title

H3

Card title

Body

Normal text

Caption

Secondary information

---

# Border Radius

Cards

Large

Buttons

Medium

Inputs

Medium

Dialogs

Large

Use the same radius throughout the application.

---

# Shadows

Use subtle shadows.

Never create floating interfaces with heavy shadows.

---

# Spacing

Follow an 8px spacing system.

Common spacing

4

8

16

24

32

48

64

Avoid arbitrary spacing values.

---

# Icons

Use Lucide Icons only.

Icons should always accompany important actions.

Do not overuse icons.

---

# Layout

Desktop

Sidebar

-

Top Navigation

-

Content Area

---

Mobile

Top Navigation

↓

Content

↓

Floating Navigation if required

Sidebar becomes a Drawer.

---

# Sidebar

Contains:

Dashboard

Applications

Companies

CV Versions

Analytics

Settings

Logout

Current page should always be highlighted.

---

# Top Navigation

Contains:

Current page title.

Search.

Theme toggle.

User menu.

---

# Dashboard

Contains:

KPI Cards.

Charts.

Recent Applications.

Quick Actions.

The dashboard should immediately communicate the current state of the job search.

---

# Cards

Cards should contain:

Title

Optional description

Content

Optional footer

Cards should never become visually overloaded.

---

# Tables

Tables should support:

Sorting

Filtering

Pagination

Responsive layout

Empty state

Loading state

Selection

---

# Forms

Every form should include:

Labels

Validation messages

Placeholders

Required indicators

Submit button

Cancel button

Validation errors should appear immediately.

---

# Buttons

Button types

Primary

Secondary

Outline

Ghost

Danger

Loading state required.

Disabled state required.

---

# Inputs

Support:

Text

Textarea

Number

Date

Select

Autocomplete

Search

Inputs should always include labels.

---

# Modals

Use dialogs for:

Confirmation

Deletion

Editing

Creation

Dialogs should trap keyboard focus.

---

# Toast Notifications

Display success notifications after:

Create

Update

Delete

Status Change

Display error notifications when operations fail.

---

# Empty States

Every empty screen should explain:

Why it is empty.

How to start.

Example

"No applications yet."

CTA

"Create your first application."

---

# Loading States

Every asynchronous operation should display loading feedback.

Use Skeleton Components whenever possible.

Avoid layout shifts.

---

# Responsive Behaviour

Desktop

> = 1024px

Tablet

768px - 1023px

Mobile

<768px

Every feature must remain fully usable on mobile.

---

# Accessibility

Keyboard navigation required.

Visible focus states required.

Semantic HTML required.

Sufficient color contrast required.

ARIA attributes where appropriate.

WCAG AA compliance target.

---

# Landing Page

Sections

Hero

Features

Analytics Preview

Pricing

FAQ

CTA

Footer

Simple.

Focused.

Fast.

---

# Login Page

Centered card.

Email

Password

Login button.

Forgot password.

Register link.

---

# Register Page

Centered card.

Name

Email

Password

Register button.

Login link.

---

# Dashboard Page

Components

KPI Cards

Charts

Recent Applications

Insights

Quick Actions

---

# Applications Page

Components

Table

Filters

Search

Create button

Pagination

Bulk actions are out of scope.

---

# Application Detail

Contains

General Information

Current Status

Status History

Notes

Actions

Everything related to one application should exist on this page.

---

# Companies Page

Table

Search

Create

Edit

Archive

---

# CV Versions Page

Simple management interface.

List.

Create.

Edit.

Archive.

---

# Search Page (Version 2, Phase 27)

Reached from Top Navigation's Search dropdown via a "View all results" link - not a Sidebar item.

Contains

Three sections: Companies, Applications, Notes.

Each section shows its own result count and its own pagination - independent of the other two sections.

No filters, no sorting - the same case-insensitive partial matching Search already performs, just without the dropdown's fixed result cap.

Empty state before any query is entered.

Empty state per section when that section has no matches.

---

# Analytics Page

The most important page of the application.

Contains:

Charts

Comparisons

Insights

Trends

Funnel

KPIs

This page should communicate value immediately.

---

# Settings Page

Theme

Profile

Danger Zone

Future settings may be added later.

---

# Animation

Animations should be subtle.

Use transitions under 200ms.

Avoid excessive motion.

Do not animate every interaction.

---

# Error Pages

404

Simple.

Friendly.

Return to Dashboard.

---

500

Explain that something unexpected happened.

Allow retry.

---

# Design Consistency

The same interaction should always produce the same result.

Buttons should always look identical.

Forms should always behave identically.

Tables should always behave identically.

Users should never have to learn different interaction patterns.

---

# Claude Instructions

Every new page must follow this design system.

Never introduce new visual patterns unless explicitly approved.

Reuse existing components whenever possible.

Prefer composition over duplication.

Maintain visual consistency across the entire application.

The interface should always prioritise usability over decoration.

JobTracker Insights is a professional productivity tool.

The design should communicate trust, simplicity and efficiency.
