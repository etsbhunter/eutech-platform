# Deployment Runbook

Status: placeholder. Deployment targets, CI/CD pipeline, and environment topology have not been decided yet — this document will be filled in during Phase 5 ("hardening") once there is something real to deploy beyond local development.

## What must be decided before this document is real

- Hosting target for `backend` (container platform, PaaS, VM) and `frontend` (Vercel, container, static export + CDN).
- Production PostgreSQL provisioning and backup/restore policy.
- Secret management (JWT signing secrets, LemonSqueezy API key/webhook secret, database credentials) — must never reuse the local placeholder values from `.env.example`.
- Migration rollout strategy (`prisma migrate deploy` in a release step, not `migrate dev`).
- Log/error monitoring destination, with the same "never log secrets/tokens/payment data" constraint as local development.

## Local-to-staging checklist (fill in once a staging environment exists)

- [ ] `prisma migrate deploy` runs cleanly against a fresh staging database.
- [ ] Backend `pnpm build` + `pnpm test` pass in CI.
- [ ] Frontend `pnpm build` passes in CI.
- [ ] Real LemonSqueezy test-mode credentials configured; `BILLING_PROVIDER` switched off `fake`.
- [ ] Health check (`GET /api/v1/health`) wired into the hosting platform's readiness probe.
