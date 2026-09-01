# Security

## Tenant isolation — IMPLEMENTED

Every organization-scoped Prisma query filters by the caller's own `organizationId`, derived from the authenticated JWT (`AccessTokenGuard` + `CurrentUser` decorator) — never from a client-supplied value alone. `OrganizationsService.getByIdForUser` looks up by the composite `(userId, organizationId)` membership key and returns an identical `NotFoundException` whether the organization doesn't exist or the caller isn't a member of it, so a guessed ID never reveals which organizations exist. Verified live: a second user requesting the first user's real organization ID and a nonexistent ID both receive 404, and each user's `GET /organizations/me` only lists their own memberships.

## Authentication (Phase 2) — IMPLEMENTED

- JWT access tokens (15-minute default TTL) + rotated, SHA-256-hashed, opaque refresh tokens in HttpOnly cookies scoped to `/api/v1/auth` — matching clinic-platform's own pattern rather than the excluded prototype's broken Sanctum guard aliasing.
- **Refresh-token reuse detection**: if an already-rotated-out refresh token is presented again, the entire session family for that user is revoked (`AuthService.refresh`) — verified live.
- Password hashing via Node's built-in `crypto.scrypt` (16-byte random salt, N=16384/r=8/p=1), not argon2 — see `ARCHITECTURE.md` for why (no native build toolchain in this environment).
- Password policy enforced via a custom class-validator decorator (`IsStrongPassword`): minimum 8 characters, at least one uppercase, one lowercase, one number, one symbol — replacing the excluded prototype's 6-character minimum with no complexity rule. Guidance text is shown in the registration/reset forms in both EN and ZH.
- Generic/no-enumeration responses for `forgot-password` — verified live: an existing and a nonexistent email both receive the identical response body.
- Password reset and email verification tokens are single-use opaque tokens (SHA-256 hashed at rest, like refresh tokens), each with its own TTL (1 hour / 24 hours); a successful password reset revokes all of that user's existing refresh tokens, forcing re-login everywhere.
- Frontend `AuthContext.authenticatedFetch` implements the global 401 handling: on a 401 it attempts one silent refresh; if that also fails, it clears local auth state and redirects to `/login` with a safe, same-origin-only `returnUrl` and a `reason=session_expired` flag the login page surfaces as a message.
- Never log passwords, tokens, cookies, full request payloads, or payment data — the excluded prototype's plaintext-password logging and CSRF-token logging are explicitly documented pitfalls to avoid (`LEGACY_ASSESSMENT.md`). The notification-stub logs in `AuthService` (email verification / password reset) log only the generated opaque token, never a password.

## Billing/webhooks

See `BILLING_AND_WEBHOOKS.md` — signature verification against the raw body, persisted idempotency keys, no fabricated payment success from a browser redirect alone (master brief acceptance scenario 9).

## Provisioning

Never report a workspace `ready` until clinic-platform confirms a genuine workspace ID and access URL (see `PROVISIONING_CONTRACT.md`).

## Support tickets and attachments (Phase 5+)

- Product-aware, organization-scoped API resources; authorization enforced in policies/guards, not only frontend route guards.
- Internal notes (`SupportTicketComment.isInternalOnly`) must never be returned by customer-facing endpoints — enforced by a dedicated customer API resource shape, not a shared serializer with a flag.
- Attachments: explicit MIME allowlist verified from file contents (not extension), private object storage, short-lived authorized URLs only, generated storage keys (never the original filename as a path), malware scanning before availability, EXIF stripping, audit log entries for internal staff viewing/downloading potentially sensitive attachments.

## Eutech Admin authorization — IMPLEMENTED

`AdminGuard` grants access to `/admin/*` only to a user holding an `EUTECH_INTERNAL_ADMIN` `OrganizationMembership` row (in any organization — there is no separate staff table). Verified live: a regular customer receives 403 from every admin endpoint. There is deliberately **no endpoint that edits `Subscription.status` directly** — the only way an internal user can grant access outside the normal billing webhook flow is the manual `Entitlement` override (`POST /admin/organizations/:id/entitlements`), which requires a `reason` (min 10 characters) and an `expiresAt`, records the granting admin's user ID, and writes an `AuditLog` row — satisfying the master brief's "never let internal users fake an active subscription" rule by construction, not by a runtime check that could be bypassed. The provisioning-retry admin action is similarly always audit-logged and only ever acts on a genuinely `FAILED` instance.

## Rate limiting

`@nestjs/throttler` applied globally (`APP_GUARD`), with a stricter override already in place on `POST /demo-requests` (5/min) to mitigate spam/abuse — the same pattern extends to login, registration, password reset, and checkout-start endpoints in later phases.

## Secrets

No `.env` file is committed anywhere in this repository (`.gitignore` ignores `.env`/`.env.*`, allowing only `.env.example`). Local development secrets generated for this repository (JWT signing secrets, the `eutech_user` database password) are placeholders for local use only and must be regenerated for any shared or production environment.
