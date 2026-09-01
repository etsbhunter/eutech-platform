# UAT Test Cases

This tracks the 30 minimum acceptance scenarios from `EUTECH_CLAUDE_MASTER_INSTRUCTION.md` against implementation status. Detailed step-by-step UAT scripts will be filled in per phase as each feature is built; this table is the tracking source of truth.

| # | Scenario | Status |
|---|---|---|
| 1 | Visitor switches EN/ZH and the selection persists | Implemented (locale-prefixed routing via next-intl; manual verification done, automated persistence test pending) |
| 2 | Visitor views Eutech Clinic plans and switches monthly/annual pricing | Implemented (`/pricing` toggle) |
| 3 | Enterprise CTA creates a demo request rather than self-service checkout | Implemented (Enterprise plan routes to `/contact`) |
| 4 | New user registers with the strong password policy and verifies email | Implemented (`/register`, `POST /auth/verify-email`) — verified live |
| 5 | Duplicate email and password reset flows do not leak unsafe account information | Implemented — duplicate email returns 409 without confirming which detail conflicted; forgot-password returns an identical response for existing and nonexistent emails — verified live |
| 6 | Authenticated owner creates/joins only their organization | Implemented (`POST /organizations`, `GET /organizations/me`) |
| 7 | One clinic cannot access another clinic's records | Implemented at the organization level (`OrganizationsService.getByIdForUser`) — verified live with a real cross-user request returning 404 |
| 8 | Checkout is associated with the correct organization, product, plan, price and user | Implemented — `BillingService.createCheckout` resolves the price by `planSlug`+`interval` and stamps `organizationId`; verified live |
| 9 | Success redirect without verified payment does not grant access | Implemented — verified live: `GET /organizations/:id/subscription` shows no active entitlement immediately after `/checkout/fake` loads, and only flips after the explicit `POST /billing/fake/complete-checkout` server-side call |
| 10 | Valid activation webhook creates/updates one subscription and entitlements | Implemented — verified live with a real HMAC-signed LemonSqueezy fixture |
| 11 | Duplicate webhook does not duplicate subscription, invoice or provisioning work | Implemented — verified live (identical replay returns `duplicate: true`, no second write) for both the fake and LemonSqueezy paths |
| 12 | Forged webhook is rejected | Implemented — verified live (wrong signature and wrong secret both → 401) |
| 13 | Past-due/canceled status applies the configured grace/access rules | Partially implemented — `WebhookProcessorService`'s `ACCESS_GRANTING_STATUSES` list encodes this; not yet exercised against a full past-due→canceled lifecycle live |
| 16 | Billing admin can open the hosted billing portal | Implemented — `POST /billing/portal`, role-gated to owner/billing-admin, verified live |
| 14 | Activated clinic completes onboarding and receives one retry-safe provisioning job | Implemented — verified live: repeated `POST .../provisioning` calls while `QUEUED`/`PROVISIONING`/`READY` never create a second `ProductInstance` or call the adapter again |
| 15 | Workspace button remains disabled until provisioning is genuinely ready | Implemented — verified live: `workspaceId`/`accessUrl` stay `null` through `QUEUED`/`PROVISIONING` and are only set once the adapter reports `ready`; the frontend only renders "Open Eutech Clinic" when both are present |
| 17 | Expired session causes a clean redirect to login rather than a hanging page | Implemented (`AuthContext.authenticatedFetch` refresh-once-then-redirect with `reason=session_expired`) |
| 18 | Customer cannot access Eutech Admin | Implemented — verified live: a regular customer JWT gets 403 from `/admin/dashboard` (and every other `/admin/*` route, all behind the same `AdminGuard`) |
| 19 | Internal manual entitlement requires permission, reason and expiry and creates an audit log | Implemented — verified live: missing `reason` → 400; valid grant creates an `Entitlement` and an `AuditLog` row with the reason and expiry recorded |
| 20-30 | Remaining data-hygiene, support-ticket, and attachment-security scenarios | Not started — tracked per-phase in `IMPLEMENTATION_PLAN.md`; support tickets were always their own scope of work beyond the five suggested phases |

Automated coverage added so far:
- `backend/src/health/health.controller.spec.ts` — health check up/down states.
- `backend/src/demo-requests/demo-requests.service.spec.ts` — valid submission persists, missing consent rejected, honeypot submission silently dropped.
- `backend/src/common/password.spec.ts` — scrypt hash/verify round trip, wrong password rejected, salts differ per hash.
- `backend/src/common/strong-password.validator.spec.ts` — password policy accepts/rejects the documented cases.
- `backend/src/auth/auth.service.spec.ts` — register/login/refresh-rotation/reuse-detection/logout/reset-password, 9 cases.
- `backend/src/organizations/organizations.service.spec.ts` — org creation grants ownership; tenant isolation denies cross-user access with the same not-found error as a nonexistent ID.
- `backend/src/billing/lemonsqueezy-billing.provider.spec.ts` — signature verification (valid/forged/wrong-secret/missing), idempotency-key stability, status mapping.
- `backend/src/billing/webhook-processor.service.spec.ts` — new event grants entitlement, duplicate event is a no-op, canceled status revokes entitlement, unresolvable plan/price fails the event and records the failure reason.
- `backend/src/billing/billing.service.spec.ts` — checkout/portal authorization (membership + role required), fake-checkout-completion guard (refuses outside fake mode).
- `backend/src/catalogue/catalogue.service.spec.ts` — catalogue shaping, missing/inactive product rejected, Enterprise correctly has no price.
- `backend/src/provisioning/provisioning.service.spec.ts` — role/clinic-profile/entitlement gating, idempotent in-flight requests, retry-from-`FAILED`, state machine only reports `READY` once the adapter confirms both `workspaceId` and `accessUrl`.
- `backend/src/organizations/clinic-profile.service.spec.ts` — tenant isolation on read, edit restricted to owner/product-admin roles.
- `backend/src/admin/admin.guard.spec.ts` — grants access only to a user with an `EUTECH_INTERNAL_ADMIN` membership.
- `backend/src/admin/admin.service.spec.ts` — dashboard count aggregation, organization list shaping/pagination defaults, both audited actions (provisioning retry, manual entitlement grant) write the expected `AuditLog` row.
