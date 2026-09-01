import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SubscriptionStatus } from "@prisma/client";
import {
  BillingProvider,
  CheckoutInput,
  NormalizedWebhookEvent,
} from "./billing-provider.interface";
import { getPrimaryFrontendOrigin } from "../common/frontend-origin";

// Local/dev/test only. No network calls, no real payment. The checkout
// "session" is just a URL to a frontend page that lets a developer manually
// simulate a completed payment by calling the fake webhook endpoint --
// access is still only ever granted through that server-side call, never
// from the redirect itself.
@Injectable()
export class FakeBillingProvider implements BillingProvider {
  async createCheckoutSession(input: CheckoutInput): Promise<{ url: string }> {
    const checkoutId = randomUUID();
    const frontendOrigin = getPrimaryFrontendOrigin();
    const params = new URLSearchParams({
      checkoutId,
      organizationId: input.organizationId,
      productSlug: input.productSlug,
      planSlug: input.planSlug,
      interval: input.interval,
    });
    return { url: `${frontendOrigin}/checkout/fake?${params.toString()}` };
  }

  async createPortalSession(providerCustomerId: string): Promise<{ url: string }> {
    const frontendOrigin = getPrimaryFrontendOrigin();
    return {
      url: `${frontendOrigin}/account/billing/fake-portal?customerId=${encodeURIComponent(providerCustomerId)}`,
    };
  }

  verifyAndParseWebhook(rawBody: Buffer): NormalizedWebhookEvent {
    // Not used by the fake checkout flow (see billing.controller.ts's
    // fake-complete-checkout endpoint, which builds the event directly) --
    // implemented for interface completeness only.
    return JSON.parse(rawBody.toString("utf8")) as NormalizedWebhookEvent;
  }

  mapProviderStatus(providerStatus: string): SubscriptionStatus {
    return providerStatus as SubscriptionStatus;
  }
}
