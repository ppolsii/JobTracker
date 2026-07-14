# JobTracker Insights

Version: 1.0

---

# Purpose

This repository contains the complete specification for JobTracker Insights.

The purpose of this documentation is to provide enough information for an AI software engineer to implement the entire application without making architectural or business decisions.

Every document inside `/docs` is considered part of the specification.

If implementation and documentation differ, the documentation is always correct.

---

# Project Philosophy

This project is being developed as a real SaaS product.

It is NOT:

- a tutorial
- a university project
- a proof of concept

Every implementation should be production-ready.

The codebase should be maintainable, scalable and reusable for future SaaS projects.

---

# Product Summary

JobTracker Insights helps job seekers understand and improve their job search.

The application is NOT another Kanban board.

The application is NOT another spreadsheet.

The application is NOT an AI assistant.

The application is a Job Search Analytics Platform.

Applications are stored only because analytics requires historical data.

The value of the product comes from analytics, not from storage.

---

# Main Objective

Help users answer questions like:

- Which CV version performs better?
- Which companies answer more often?
- Which application source performs better?
- Where do I usually fail?
- Am I improving over time?

The application must answer these questions using only user generated historical data.

No AI should be required.

---

# Hard Constraints

Before implementing anything, read PROJECT_CONSTRAINTS.md.

These constraints are mandatory.

The MVP must:

- have zero monthly operational costs before monetization
- not depend on paid APIs
- not require AI
- not require external paid services
- be deployable using only free tiers

If a feature requires a paid service:

STOP.

Look for an alternative.

---

# Documentation Structure

Read the documentation in the following order.

1. README.md

2. PROJECT_CONSTRAINTS.md

3. VISION.md

4. VALUE_PROPOSITION.md

5. BUSINESS_RULES.md

6. DECISIONS.md

7. ARCHITECTURE.md

8. DATABASE.md

9. API.md

10. FEATURES.md

11. ANALYTICS_ENGINE.md

12. UI_SYSTEM.md

13. CODE_STYLE.md

14. DEPLOYMENT.md

15. IMPLEMENTATION_ORDER.md

16. IMPLEMENTATION_RULES.md

17. AI_GUIDE.md

18. CHANGELOG.md

19. KNOWN_ISSUES.md

---

# Source of Truth

Priority order.

1. PROJECT_CONSTRAINTS.md

2. IMPLEMENTATION_RULES.md

3. DECISIONS.md

4. BUSINESS_RULES.md

5. FEATURES.md

6. DATABASE.md

7. API.md

8. ARCHITECTURE.md

9. Remaining documents

If two documents conflict, always follow the document with higher priority.

---

# Development Principles

Every implementation should prioritise:

- Simplicity
- Readability
- Maintainability
- Scalability
- Explicitness
- Type Safety

Avoid:

- Overengineering
- Premature optimisation
- Unnecessary abstractions
- Unnecessary dependencies

The project should remain understandable by a single developer.

---

# MVP Scope

The MVP includes only:

- Authentication
- User Profile
- Company Management
- CV Version Management
- Job Application Management
- Dashboard
- Analytics
- Search
- Filtering
- Responsive UI
- Dark Mode

Everything else belongs to future versions.

---

# Explicitly Out of Scope

Do NOT implement:

- AI
- CV optimisation
- Interview simulator
- Cover Letter Generator
- LinkedIn integration
- Browser extension
- Mobile App
- Public API
- Teams
- Chat
- Notifications
- Email automation
- Salary prediction
- Job recommendation engine
- Recruiter features

These features are intentionally excluded from the MVP.

---

# Project Goals

Primary goal:

Validate that users are willing to pay for analytics.

Secondary goal:

Create a reusable SaaS architecture that can become the foundation for future products.

The codebase should eventually become a generic SaaS Boilerplate.

---

# Expected Quality

The project must be production ready.

Expected characteristics:

- Strong typing
- Clean Architecture
- Feature-first organisation
- Secure by default
- Accessible
- Fully responsive
- Easily testable
- Easy to extend

---

# General Rules

Never invent business logic.

Never modify the database schema without updating DATABASE.md.

Never implement undocumented behaviour.

Never install libraries unless they provide significant value.

Never expose secrets.

Never bypass authentication.

Never bypass Row Level Security.

Always validate every request.

---

# Claude Instructions

Read every document before writing code.

Never assume behaviour that is not documented.

If documentation is incomplete:

STOP.

Explain what is missing.

Ask for clarification.

Do not guess.

Do not invent.

Follow the architecture exactly as documented.

Business rules are more important than implementation simplicity.

Project constraints are more important than developer convenience.

When several implementations are possible:

Choose the simplest one that satisfies every documented requirement.

The objective is NOT to generate the fastest code.

The objective is to generate maintainable production-quality software.
