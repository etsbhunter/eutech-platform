# Eutech Platform

Commercial SaaS portal for Eutech Clinic: marketing site, customer/admin portal, subscription billing,
clinic provisioning (provisions `../clinic-platform`; never edit that repo from here without approval).
`backend/` NestJS + Prisma, `frontend/` Next.js (read `frontend/AGENTS.md` — this Next.js version has
breaking changes). pnpm + Turborepo: `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm dev`.

- Docs: `docs/INDEX.md` — open only the one the task needs.
- Billing changes go through the provider abstraction and verified webhooks only (`docs/BILLING_AND_WEBHOOKS.md`).
- Tenant isolation and security requirements: `docs/SECURITY.md`. Provisioning contract: `docs/PROVISIONING_CONTRACT.md`.
- The working tree often holds large uncommitted WIP: never stash, reset or discard it.
