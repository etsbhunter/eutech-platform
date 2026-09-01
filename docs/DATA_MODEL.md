# Data Model

Full schema: `backend/prisma/schema.prisma`. Only `DemoRequest` is wired to a live API endpoint today (Phase 1); everything else below is the agreed target shape for Phases 2-5, already migrated into the `eutech_platform` database so later phases don't require destructive schema churn.

## Phase 1 (implemented)

- **DemoRequest** — captures name, business email, phone, clinic name, branch count, preferred contact method, message, consent timestamp, and UTM source/medium/campaign. Backs both `/demo` and `/contact`.

## Phase 2 (schema only)

- **User** — email, password hash (`scrypt`, see `ARCHITECTURE.md` for why not argon2), full name, email verification timestamp.
- **Organization** — the commercial customer (a clinic business), not to be confused with a clinic-platform `Clinic` tenant.
- **OrganizationMembership** — join table with role: `ORGANIZATION_OWNER`, `BILLING_ADMIN`, `PRODUCT_ADMIN`, `EUTECH_INTERNAL_ADMIN`.

## Phase 3 (schema only)

- **Product**, **Plan**, **Price** (money as integer minor units + ISO currency, `isPlaceholder` flag), **Feature**, **PlanFeature**.
- **Subscription** — status enum covers the full lifecycle: `TRIALING`, `INCOMPLETE`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `PAUSED`, `CANCELING`, `CANCELED`, `EXPIRED`.
- **Entitlement** — links to a subscription, or stands alone as a manual override (`isManualOverride`, `reason`, `expiresAt`) for audited internal exceptions.
- **BillingCustomer**, **Invoice**, **WebhookEvent** (unique `[provider, providerEventId]` constraint for idempotency).

## Phase 4 (schema only)

- **ClinicProfile** — non-clinical onboarding info (registered name, address, branch count, operating hours, staff estimate).
- **ProductInstance** — the provisioning record. `provisioningRequestId` is the idempotency key sent to clinic-platform's (proposed) provisioning API. `provisioningStatus` enum: `NOT_STARTED`, `QUEUED`, `PROVISIONING`, `READY`, `FAILED`, `SUSPENDED`. `workspaceId`/`accessUrl` are only populated once clinic-platform confirms readiness.

## Support tickets (schema only)

- **SupportTicket** — product-aware, organization-scoped, with `publicReference` (e.g. `EUC-2026-000128`) separate from the internal `id`, and `submissionIdempotencyKey` to make retried submissions safe.
- **SupportTicketAttachment**, **SupportTicketComment** (`isInternalOnly` flag so internal notes never reach customer-facing queries), **SupportTicketStatusHistory** (immutable audit trail of status transitions).

## Audit

- **AuditLog** — generic actor/action/target/metadata record for sensitive administrative actions (manual entitlement grants, provisioning retries, internal attachment views).

## What is deliberately absent

No table in this schema stores patients, visits, appointments, consultations, prescriptions, dispensing records, medicines, stock, inventory batches, or medical documents. Those remain exclusively in clinic-platform's own Prisma schema, which this repository never queries.
