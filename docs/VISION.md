# VISION.md

# JobTracker Insights

Version: 1.0

---

# Vision Statement

JobTracker Insights is a personal job search tracking and analytics platform.

Its purpose is to help users organize, measure and understand their own job search using their own historical data.

The platform is not designed to find jobs.

The platform is not designed to write CVs.

The platform is not an AI assistant.

The platform does not compete with LinkedIn.

The application never invents recommendations.

It never claims that one CV is objectively better than another.

It never claims to know why a candidate succeeds or fails.

Instead, it presents objective metrics and analytics derived from the user's own activity.

The application reports facts. The user draws conclusions.

The product transforms job searching into a measurable process.

Think about JobTracker as:

> Google Analytics for your job search.

---

# Mission

Help job seekers make better decisions by understanding their own data.

Every application sent by a user becomes another data point that contributes to understanding:

- what works
- what doesn't work
- what should change

Instead of relying on intuition, users should rely on metrics.

---

# Product Philosophy

The product follows five fundamental principles.

---

## Principle 1

Collect data once.

Reuse it forever.

The user should never have to introduce the same information twice.

Every piece of information entered should generate future value.

Example:

The user selects:

Company:
Spotify

Months later the system already knows:

- number of applications
- response rate
- interview rate
- average response time

No additional work required.

---

## Principle 2

No Artificial Intelligence for core functionality.

The platform should generate value using deterministic calculations.

Everything shown to the user must be explainable.

Examples:

GOOD

"Your Backend CV obtained interviews in 22% of applications."

BAD

"Our AI thinks your Backend CV is better."

Users should trust numbers.

Not opinions.

---

## Principle 3

The application should be extremely fast.

Most users will interact with it immediately after applying for a job.

Adding one application should take less than one minute.

Preferably less than thirty seconds.

---

## Principle 4

Every dashboard metric must answer a real question.

Never display metrics just because they look interesting.

Each graph should answer a specific business question.

Example

Question

Where do I usually fail?

Metric

Application Funnel

Applied

↓

HR

↓

Technical

↓

Final

↓

Offer

↓

Accepted

Immediately useful.

---

## Principle 5

Simple over complex.

Every feature added to the MVP must satisfy one condition.

It must help the user obtain more interviews or more offers.

Otherwise it should not exist.

---

# Problem Statement

Current tools are passive.

Excel stores data.

Notion stores data.

Google Sheets stores data.

Trello stores data.

None of them analyse anything.

The user finishes the job search knowing:

"I sent 143 applications."

But cannot answer:

- Which CV worked better?
- Which source generated interviews?
- Which company types answered more?
- Which interview stage eliminated me?
- Was I improving?

JobTracker exists to answer these questions.

---

# Value Proposition

Traditional Tracker

Stores applications.

JobTracker

Explains the results of those applications.

Traditional Tracker

History.

JobTracker

History + Analytics.

Traditional Tracker

Kanban.

JobTracker

Decision Support System.

---

# Target Users

Primary Users

Professionals actively looking for jobs.

Characteristics

20+

Applications sent.

Interested in improving.

Uses spreadsheets or similar tools.

Technology friendly.

Examples

Software Engineers

Product Managers

Data Scientists

UX Designers

DevOps Engineers

Cybersecurity Engineers

QA Engineers

---

Secondary Users

University students.

Recent graduates.

Career changers.

Bootcamp students.

---

Future Users

Career coaches.

Recruiters.

Universities.

Outplacement companies.

These users are outside MVP.

---

# User Goals

Users want to answer questions.

Examples

Am I applying to the wrong companies?

Should I modify my CV?

Should I stop using LinkedIn Easy Apply?

Are referrals worth it?

Is remote work easier to obtain?

How many applications do I need on average before receiving interviews?

JobTracker should eventually answer these questions using historical data.

---

# Business Goals

Goal 1

Validate product.

Success metric

10 paying users.

---

Goal 2

Validate retention.

Success metric

Users continue registering applications after one month.

---

Goal 3

Validate willingness to pay.

Target

5 €/month.

---

Goal 4

Reach profitability.

Target

100 paying users.

MRR

500 €/month.

---

# Product Positioning

JobTracker should not be positioned as:

- another productivity tool
- another Kanban board
- another spreadsheet

Instead position it as:

Job Search Analytics Platform.

The tracker is only a mechanism for collecting data.

Analytics is the actual product.

---

# Competitive Advantage

The application should compete on insights.

Not features.

Competitors can copy a Kanban.

Competitors can copy dashboards.

What creates value is the interpretation of accumulated historical data.

Over time every user builds a personal dataset.

That dataset becomes increasingly valuable.

The longer the user stays, the more useful the platform becomes.

---

# Product Scope

The MVP includes only:

Authentication

User Profile

Application Management

Company Management

CV Version Management

Dashboard

Analytics

Insights

Search

Filtering

Responsive Design

Dark Mode

Nothing else.

---

# Explicitly Out of Scope

## Permanently Out of Scope

These are not deferred. They contradict the product vision and must not be implemented in any future version, unless explicitly reframed as objective analytics derived entirely from the user's own data.

Artificial Intelligence.

Interview simulator.

ATS optimisation.

CV generation.

Cover letter generation.

Job recommendations.

Salary prediction.

## Deferred to Future Versions

These are ordinary organisational and integration features. They do not conflict with the vision and may be implemented later.

Browser extensions.

LinkedIn integration.

Calendar synchronisation.

Email automation.

Notifications.

Social network.

Messaging.

Recruiter marketplace.

Public API.

Native mobile apps.

---

# Success Metrics

The project success should not only be measured by revenue.

Monitor

Daily Active Users

Weekly Active Users

Monthly Active Users

Applications created per week

Average applications per user

Dashboard visits

Retention after 30 days

Average session duration

Average applications before first interview

Conversion Free → Paid

---

# Product Principles

Every feature should satisfy at least one of these objectives.

Save user time.

Reduce manual work.

Generate useful information.

Improve decision making.

Increase interview probability.

Increase offer probability.

If a feature does not satisfy at least one of these principles it should not be implemented.

---

# MVP Definition

The MVP is complete when a user can:

Register.

Login.

Create CV versions.

Create companies.

Create applications.

Move applications through the recruitment pipeline.

Associate applications with companies.

Associate applications with CV versions.

View historical data.

Understand personal analytics.

Export personal data.

Use the application on desktop and mobile.

Everything else is secondary.

---

# Claude Instructions

Understand that this product is NOT a tracker.

It is an analytics platform.

The tracker only exists because analytics requires data.

When implementing features always ask yourself:

Does this feature improve analytics?

If the answer is no, reconsider the implementation.

Do not optimise for number of features.

Optimise for user understanding.

Every implementation should reinforce the central idea:

"Help users make better decisions using their own historical job search data."

Never introduce AI to solve problems already solvable using deterministic calculations.

When in doubt, choose simplicity.
