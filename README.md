# Eutech Platform

Eutech is a software company and SaaS subscription portal. Its first product is **Eutech Clinic**, a bilingual (EN/ZH) clinic-management platform. This repository is the commercial platform: public marketing site, customer account portal, subscription billing, and clinic-workspace provisioning. It is a separate repository from the clinic-management product itself (`clinic-platform`), which Eutech sells and provisions but does not own the source of.

## Repository layout

```
eutech-platform/
  backend/    NestJS + Prisma + PostgreSQL commercial API
  frontend/   Next.js public site + customer/admin portal
  docs/       Architecture, data model, billing, security, provisioning, setup docs
```

## Why this stack

`clinic-platform` (the product Eutech sells) is a NestJS + Prisma + PostgreSQL + Next.js application using JWT access tokens with rotated refresh tokens. Eutech deliberately matches that stack so that a future trust relationship between the two systems (e.g. clinic-platform accepting Eutech-issued tokens) is a natural extension rather than a bridge between two ecosystems. See `docs/ARCHITECTURE.md` for the full rationale, including where this diverges from the original Laravel/Vue-based product brief.

## Local setup

See `docs/LOCAL_SETUP_WINDOWS.md`.

## Documentation

- `docs/LEGACY_ASSESSMENT.md` — assessment of `clinic-platform`, `nextleap-backend`, `nextleap-frontend`, `nextleap`
- `docs/IMPLEMENTATION_PLAN.md` — phased implementation plan
- `docs/ARCHITECTURE.md` — system architecture and stack rationale
- `docs/DATA_MODEL.md` — commercial data model (Prisma schema walkthrough)
- `docs/BILLING_AND_WEBHOOKS.md` — billing provider abstraction and webhook handling
- `docs/PROVISIONING_CONTRACT.md` — the Eutech ↔ clinic-platform provisioning contract
- `docs/SECURITY.md` — security requirements and tenant isolation
- `docs/LOCAL_SETUP_WINDOWS.md` — Windows/Laragon local development setup
- `docs/DEPLOYMENT_RUNBOOK.md` — deployment runbook
- `docs/UAT_TEST_CASES.md` — UAT acceptance scenarios
- `docs/SUPPORT_AND_BUG_REPORTING.md` — support-ticket module design

## Data ownership

Eutech owns commercial data only: accounts, organizations, subscriptions, entitlements, onboarding, and product-instance references. Clinical data (patients, visits, consultations, prescriptions, medicines, inventory) lives exclusively in `clinic-platform` and is never duplicated here.
