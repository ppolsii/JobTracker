# DEPLOYMENT.md

Version: 1.0

---

# Purpose

This document defines how JobTracker Insights should be deployed.

The deployment process must be:

- Simple
- Reproducible
- Automated
- Low cost
- Production ready

The MVP must be deployable using only free services.

---

# Deployment Philosophy

The deployment should require the minimum amount of manual work.

Every push to the main branch should automatically deploy the application.

No manual server configuration should be required.

Infrastructure complexity should remain as low as possible.

---

# Infrastructure

Frontend

Next.js

↓

Hosting

Vercel

↓

Database

Supabase PostgreSQL

↓

Authentication

Supabase Auth

---

# Hosting

Provider

Vercel

Environment

Production

Requirements

Automatic deployments

Preview deployments

HTTPS enabled

Automatic SSL

---

# Database

Provider

Supabase

Environment

Production Project

Requirements

PostgreSQL

Authentication

Row Level Security

Automatic Backups (handled by Supabase)

---

# Repository

Provider

GitHub

Default Branch

main

Protected Branch

main

Development Branches

feature/*

fix/*

refactor/*

docs/*

---

# Deployment Flow

Developer

↓

Commit

↓

Push

↓

GitHub

↓

GitHub Actions

↓

Build

↓

Tests

↓

Deploy

↓

Vercel

↓

Production

---

# Continuous Integration

Every Pull Request should execute:

Type Checking

Linting

Build

Unit Tests

If any step fails

Deployment must stop.

---

# Continuous Deployment

Deploy automatically when:

Branch = main

Requirements

Build successful

Tests successful

Lint successful

TypeScript successful

---

# Environment Variables

The following variables are required.

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

---

Optional

NEXT_PUBLIC_APP_URL

NODE_ENV

---

# Secrets

Secrets must never be:

Committed

Logged

Hardcoded

Exposed to the client

Only public variables may begin with

NEXT_PUBLIC_

---

# Build Process

Install dependencies

↓

Type Check

↓

Lint

↓

Build

↓

Run Tests

↓

Deploy

If any step fails

Abort deployment.

---

# Node Version

Use the latest stable LTS version supported by Next.js.

The Node version should remain consistent between local development and production.

---

# Local Development

Requirements

Node.js

Git

VS Code

Supabase Project

Commands

Install dependencies

Run development server

Connect to Supabase

No Docker required for the MVP.

---

# Production Environment

Production should use:

Optimized Build

HTTPS

Compression

Caching

Server Components

Environment Variables

---

# Monitoring

The MVP should avoid external monitoring services.

Use:

Vercel Logs

Supabase Logs

Browser Console

Future versions may integrate external monitoring solutions.

---

# Error Reporting

Unexpected errors should be logged.

Business errors should be returned to the UI.

Sensitive information must never appear in logs.

---

# Database Migrations

Every schema change must be implemented using migrations.

Manual database modifications are forbidden.

Migration files belong inside:

supabase/migrations/

Every migration should be reversible whenever possible.

---

# Backup Strategy

Supabase manages database backups.

The application should not implement additional backup mechanisms.

---

# Recovery

If deployment fails

Rollback to previous successful deployment.

If migration fails

Stop deployment immediately.

Never continue after a failed migration.

---

# Performance Requirements

Production deployment should achieve:

Lighthouse Performance > 90

Accessibility > 90

Best Practices > 90

SEO > 90

---

# HTTPS

HTTPS is mandatory.

HTTP requests should automatically redirect to HTTPS.

---

# Domain

During development

Vercel Domain

Production

Custom Domain

The domain configuration is outside the MVP scope.

---

# File Storage

The MVP does not require file uploads.

Supabase Storage should not be configured.

---

# CDN

Static assets should be served using Vercel CDN.

No external CDN is required.

---

# Caching

Use Next.js default caching strategy.

Avoid introducing Redis.

Avoid introducing external cache providers.

Caching should remain simple.

---

# Deployment Checklist

Before deployment verify:

✓ TypeScript passes

✓ Build passes

✓ Tests pass

✓ Environment variables configured

✓ Database migrations executed

✓ No console errors

✓ Authentication working

✓ RLS enabled

✓ HTTPS enabled

✓ Responsive UI verified

---

# Cost Philosophy

The deployment must respect PROJECT_CONSTRAINTS.md.

The MVP should operate using:

GitHub Free

Supabase Free

Vercel Free

No paid infrastructure should be required before monetisation.

---

# Future Deployment

Future versions may introduce:

Custom Domain

Monitoring

Analytics

Payments

Email Services

Object Storage

Background Workers

These services must not be implemented in the MVP.

---

# Claude Instructions

Deploy using the simplest possible infrastructure.

Do not introduce Docker.

Do not introduce Kubernetes.

Do not introduce Terraform.

Do not introduce AWS infrastructure.

Do not introduce unnecessary cloud services.

The deployment process should be understandable by a single developer.

The infrastructure should remain inexpensive, reliable and easy to maintain.

Respect all project constraints regarding operational costs.
