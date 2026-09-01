# Billing and Webhooks

Status: implemented in Phase 3 — see `IMPLEMENTATION_PLAN.md` for what was verified. This document describes both what's built and the one real deviation from the original interface sketch below, kept for context.

## Provider

**LemonSqueezy**, per explicit product-owner decision (overriding the master brief's Stripe default, which the brief itself allows: "unless the product owner selects another provider before implementation").

Note: `nextleap-backend`'s excluded prototype also referenced LemonSqueezy, but its webhook handler had no signature verification and was not idempotent (see `LEGACY_ASSESSMENT.md`). Nothing from that implementation is reused — the abstraction and webhook handling below are built fresh.

## Provider abstraction

A `BillingProvider` interface (`backend/src/billing/billing-provider.interface.ts`) isolates LemonSqueezy specifics from domain/controller code:

```ts
interface BillingProvider {
  createCheckoutSession(input: CheckoutInput): Promise<{ url: string }>;
  createPortalSession(providerCustomerId: string): Promise<{ url: string }>;
  verifyAndParseWebhook(rawBody: Buffer, signatureHeader?: string): NormalizedWebhookEvent;
  mapProviderStatus(providerStatus: string): SubscriptionStatus;
}
```

(`syncCustomerAndSubscription` from the original sketch was dropped — reconciliation happens by resolving `NormalizedWebhookEvent.providerPriceId` against `Price.providerPriceId` inside `WebhookProcessorService`, not as a separate provider method, since that resolution needs database access the provider itself shouldn't have.)

Two implementations: `LemonSqueezyBillingProvider` (real; requires `LEMONSQUEEZY_API_KEY`/`LEMONSQUEEZY_STORE_ID`/`LEMONSQUEEZY_WEBHOOK_SECRET`, throws a clear `InternalServerErrorException` naming the missing variable otherwise — verified live) and `FakeBillingProvider` (local/dev only, selected via `BILLING_PROVIDER=fake` in `backend/.env`, the default). **Important**: the webhook receiver at `POST /billing/webhooks/lemonsqueezy` always uses `LemonSqueezyBillingProvider` for signature verification regardless of which provider is "active" for checkout/portal — a real bug where it used the active (fake) provider instead was caught during live testing and fixed.

## Webhook handling — implemented and verified live

- LemonSqueezy's `X-Signature` HMAC-SHA256 header is verified against the exact raw request body (`main.ts` uses Nest's `rawBody: true` option so `req.rawBody` is the untouched Buffer) using a timing-safe comparison. A forged signature and a signature produced with the wrong secret are both rejected with 401 — verified live with real HMAC-signed fixtures.
- **Idempotency key caveat**: LemonSqueezy's webhook payload has no documented top-level event-ID field distinct from the resource ID. `providerEventId` is therefore a SHA-256 hash of the verified raw body — a genuine retry resends byte-identical content, so this is safe, but it should be re-verified against real LemonSqueezy webhook deliveries (e.g. do they add an idempotency header at the gateway level?) before production launch.
- `WebhookEvent.providerEventId` carries the unique `[provider, providerEventId]` constraint; `WebhookProcessorService.process` creates that row *first* and catches the Prisma P2002 unique-violation to detect a duplicate before touching `Subscription`/`Entitlement` at all — verified live by replaying an identical payload and receiving `{"duplicate": true}` with no second database write.
- `processingStatus`/`failureReason` are updated to `processed` or `failed` after the fact; no full payment payload is stored, only the normalized fields needed for reconciliation.
- Not yet implemented: queueing side effects (current processing is synchronous within the request) and explicit out-of-order-delivery reconciliation by provider timestamp — both are reasonable Phase 5 hardening items once real traffic patterns are known.

## What's buildable now without production credentials or final price IDs — done

The full domain model, `FakeBillingProvider` end-to-end (checkout → simulated completion → active subscription → duplicate detection, all verified live), and LemonSqueezy's webhook signature verification and idempotency logic (tested with locally-constructed HMAC fixtures, since no live LemonSqueezy account is available in this environment). `LemonSqueezyBillingProvider.createCheckoutSession`/`createPortalSession` are structured against LemonSqueezy's documented REST shape but have never been called against the real API — verify field names against a live account before production use.

## Pricing

`prisma/seed.ts` seeds labelled placeholder prices (Starter $49/mo, Professional $149/mo, both with a placeholder annual price; Enterprise has no self-serve price at all — it always routes to Contact Sales), per explicit product-owner approval. `Price.isPlaceholder` defaults to `true` so placeholder pricing is never silently mistaken for final pricing in reporting or admin views. The public `GET /catalogue/plans` endpoint serves this to the frontend; plan/feature display copy is translated client-side via `next-intl`, keyed by the plan/feature `slug` the API returns.
