# ANALYTICS_ENGINE.md

Version: 1.0

---

# Purpose

This document defines the Analytics Engine of JobTracker Insights.

The Analytics Engine is the core value of the product.

The application does not compete by storing job applications.

It competes by transforming historical job search data into actionable insights.

Every metric described here must be deterministic.

Artificial Intelligence is explicitly forbidden in the MVP.

---

# Principles

The Analytics Engine must satisfy the following principles.

Every metric must be:

- Explainable
- Deterministic
- Fast
- Based only on user-owned data
- Calculated in real time

No metric may depend on:

- AI
- Machine Learning
- Predictions
- External APIs
- Other users' data

---

# Data Source

Analytics are generated exclusively from:

Applications

Status History

Companies

CV Versions

Notes are excluded from analytics in the MVP.

---

# Update Strategy

Analytics are not stored.

Analytics are calculated when requested.

No scheduled jobs.

No nightly calculations.

No background workers.

Every dashboard refresh reflects the latest database state.

---

# Dashboard KPIs

The dashboard must display the following KPIs.

---

## Total Applications

Definition

Total number of active applications.

Formula

COUNT(applications)

---

## Active Applications

Definition

Applications that have not reached a final state.

Final states

Accepted

Rejected

Formula

COUNT(current_status NOT IN ('Accepted', 'Rejected'))

---

## Interviews

Definition

Applications that reached at least one interview stage.

Interview stages

HR Interview

Technical Interview

Final Interview

Offer

Accepted

Formula

COUNT(DISTINCT application_id)

where current_status >= HR Interview

---

## Offers

Definition

Applications that reached Offer.

Formula

COUNT(current_status = 'Offer' OR current_status = 'Accepted')

---

## Accepted Offers

Definition

Applications with status Accepted.

Formula

COUNT(current_status = 'Accepted')

---

## Rejected Applications

Definition

Applications with final status Rejected.

Formula

COUNT(current_status = 'Rejected')

---

# Success Metrics

---

## Response Rate

Definition

Percentage of applications that received any response.

A response is considered any status after Applied.

Formula

Applications with status > Applied

/

Total Applications

---

## Interview Rate

Definition

Percentage of applications reaching interview stages.

Formula

Interview Applications

/

Total Applications

---

## Offer Rate

Definition

Percentage of applications resulting in an offer.

Formula

Offers

/

Total Applications

---

## Acceptance Rate

Definition

Accepted Offers

/

Offers

---

# Time Metrics

---

## Average Response Time

Definition

Average number of days between:

Application Date

↓

First Response

Uses Status History.

---

## Average Offer Time

Definition

Average number of days between:

Application Date

↓

Offer

---

## Average Hiring Time

Definition

Average number of days between:

Application Date

↓

Accepted

---

# Funnel Analytics

The recruitment funnel visualises where applications are lost.

Stages

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

For every stage calculate:

Applications entering stage.

Applications progressing.

Applications rejected.

Conversion rate.

Drop-off rate.

---

# CV Analytics

Group applications by:

CV Version

Calculate

Applications

Responses

Interviews

Offers

Accepted

Rejected

Response Rate

Interview Rate

Offer Rate

Average Response Time

Sort by:

Interview Rate descending.

---

# Company Analytics

Group applications by:

Company

Calculate

Applications

Responses

Interviews

Offers

Accepted

Rejected

Response Rate

Interview Rate

Offer Rate

Average Response Time

Companies should be sortable by every metric.

---

# Source Analytics

Group applications by:

LinkedIn

Indeed

Referral

Company Website

Recruiter

Other

Calculate

Applications

Responses

Interviews

Offers

Acceptance Rate

Average Response Time

---

# Work Mode Analytics

Group applications by

Remote

Hybrid

On Site

Calculate

Applications

Interview Rate

Offer Rate

Acceptance Rate

---

# Employment Type Analytics

Group applications by

Full Time

Part Time

Internship

Contract

Freelance

Calculate

Applications

Responses

Offers

Average Response Time

---

# Monthly Analytics

Generate a monthly timeline.

For every month calculate:

Applications

Responses

Interviews

Offers

Accepted

Rejected

Average Response Time

Interview Rate

Offer Rate

---

# Trend Analysis

Compare current month against previous month.

Calculate:

Application Growth

Interview Growth

Offer Growth

Response Growth

Represent changes as percentages.

---

# Conversion Analysis

Calculate conversion between every stage.

Example

Applied

↓

Recruiter Contact

Conversion %

Recruiter Contact

↓

HR Interview

Conversion %

HR Interview

↓

Technical Interview

Conversion %

Technical Interview

↓

Final Interview

Conversion %

Final Interview

↓

Offer

Conversion %

Offer

↓

Accepted

Conversion %

---

# Best Performing CV

Determine the CV version with the highest performance.

Ranking priority

Highest Interview Rate

↓

Highest Offer Rate

↓

Highest Acceptance Rate

Minimum sample size

10 applications

Otherwise display

"Insufficient data"

---

# Best Application Source

Determine the application source producing the highest interview rate.

Minimum sample size

10 applications

---

# Best Company

Determine the company with the highest response rate.

Minimum sample size

3 applications

---

# Insights

The Analytics Engine should generate deterministic insights.

Examples

"Your Backend CV receives interviews 18% more often than your Frontend CV."

"You receive responses faster from Startup companies."

"Referrals generate your highest interview rate."

"You usually exit the recruitment process during Technical Interviews."

Insights must never speculate.

Only compare measurable values.

---

# Empty State Behaviour

If insufficient data exists:

Do not estimate.

Display:

"Not enough historical data."

Never generate misleading analytics.

---

# Minimum Data Requirements

Interview Rate

Minimum:

5 applications

Offer Rate

Minimum:

5 applications

Trend Analysis

Minimum:

2 months

CV Comparison

Minimum:

10 applications per CV

Company Comparison

Minimum:

3 applications

---

# Performance Requirements

Analytics should execute in less than 500ms.

Prefer SQL aggregation.

Avoid loading unnecessary records.

Avoid client-side calculations.

---

# Future Analytics

Future versions may include:

Interview Feedback Analysis

Salary Analysis

Skill Analysis

Technology Stack Analysis

Application Goals

Weekly Objectives

Career Progress Reports

Predictive Analytics

AI Recommendations

These features are outside the MVP.

---

# Forbidden Analytics

The MVP must never:

Guess.

Predict.

Recommend jobs.

Recommend CV wording.

Generate interview advice.

Use AI.

Use LLMs.

Compare users.

Use public datasets.

---

# Claude Instructions

Treat analytics as the primary feature of the application.

Every chart must answer a real business question.

Every metric must be reproducible using SQL.

Never calculate analytics using client-side loops if SQL aggregation can perform the same task.

Never invent metrics.

Never generate insights without measurable evidence.

The Analytics Engine defines the competitive advantage of JobTracker Insights.

Prioritise correctness over visual complexity.

Every implementation should reinforce the core promise of the product:

Transform historical job applications into actionable insights using deterministic calculations.
