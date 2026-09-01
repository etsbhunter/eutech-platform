import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { SubscriptionStatus } from "@prisma/client";
import {
  BillingProvider,
  CheckoutInput,
  NormalizedWebhookEvent,
} from "./billing-provider.interface";

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

// Structured against LemonSqueezy's documented checkout/webhook shape.
// Not exercised against the real API in this environment (no production
// credentials available) -- verify field names against a live LemonSqueezy
// account before relying on this in production. See docs/BILLING_AND_WEBHOOKS.md.
@Injectable()
export class LemonSqueezyBillingProvider implements BillingProvider {
  private requireConfig(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new InternalServerErrorException(
        `LemonSqueezy billing is not configured: missing ${name}. Set BILLING_PROVIDER=fake for local development.`,
      );
    }
    return value;
  }

  async createCheckoutSession(input: CheckoutInput): Promise<{ url: string }> {
    const apiKey = this.requireConfig("LEMONSQUEEZY_API_KEY");
    const storeId = this.requireConfig("LEMONSQUEEZY_STORE_ID");

    const response = await fetch(`${LEMONSQUEEZY_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: input.customerEmail,
              custom: { organization_id: input.organizationId },
            },
            product_options: { redirect_url: input.successUrl },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            // The variant/price ID must be resolved from Price.providerPriceId
            // for the requested plan+interval before calling this method.
          },
        },
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException("Failed to create LemonSqueezy checkout session.");
    }
    const body = (await response.json()) as { data: { attributes: { url: string } } };
    return { url: body.data.attributes.url };
  }

  async createPortalSession(providerCustomerId: string): Promise<{ url: string }> {
    const apiKey = this.requireConfig("LEMONSQUEEZY_API_KEY");
    const response = await fetch(`${LEMONSQUEEZY_API_BASE}/customers/${providerCustomerId}`, {
      headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new InternalServerErrorException("Failed to load LemonSqueezy customer portal URL.");
    }
    const body = (await response.json()) as {
      data: { attributes: { urls: { customer_portal: string } } };
    };
    return { url: body.data.attributes.urls.customer_portal };
  }

  verifyAndParseWebhook(rawBody: Buffer, signatureHeader: string | undefined): NormalizedWebhookEvent {
    const secret = this.requireConfig("LEMONSQUEEZY_WEBHOOK_SECRET");

    if (!signatureHeader) {
      throw new UnauthorizedException("Missing webhook signature.");
    }
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(signatureHeader, "hex");
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException("Invalid webhook signature.");
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as {
      meta: { event_name: string; custom_data?: { organization_id?: string } };
      data: {
        id: string;
        attributes: {
          status: string;
          customer_id: number;
          variant_id: number;
          renews_at?: string;
        };
      };
    };

    // LemonSqueezy does not guarantee a distinct top-level webhook event ID
    // field; a content hash of the verified raw body is used as the
    // idempotency key instead, since a genuine retry resends the identical
    // payload.
    const providerEventId = createHmac("sha256", secret).update(rawBody).digest("hex");

    return {
      providerEventId,
      eventType: payload.meta.event_name,
      organizationId: payload.meta.custom_data?.organization_id,
      providerCustomerId: String(payload.data.attributes.customer_id),
      providerSubscriptionId: payload.data.id,
      providerStatus: payload.data.attributes.status,
      providerPriceId: String(payload.data.attributes.variant_id),
      currentPeriodEnd: payload.data.attributes.renews_at
        ? new Date(payload.data.attributes.renews_at)
        : undefined,
    };
  }

  mapProviderStatus(providerStatus: string): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      on_trial: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      unpaid: SubscriptionStatus.GRACE_PERIOD,
      paused: SubscriptionStatus.PAUSED,
      cancelled: SubscriptionStatus.CANCELING,
      expired: SubscriptionStatus.EXPIRED,
    };
    return mapping[providerStatus] ?? SubscriptionStatus.INCOMPLETE;
  }
}
