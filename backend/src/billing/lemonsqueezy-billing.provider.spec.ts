import { createHmac } from "crypto";
import { UnauthorizedException } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { LemonSqueezyBillingProvider } from "./lemonsqueezy-billing.provider";

describe("LemonSqueezyBillingProvider", () => {
  let provider: LemonSqueezyBillingProvider;
  const secret = "test-webhook-secret";

  beforeEach(() => {
    provider = new LemonSqueezyBillingProvider();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = secret;
  });

  function signedPayload(payload: object) {
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
    return { rawBody, signature };
  }

  const samplePayload = {
    meta: {
      event_name: "subscription_created",
      custom_data: { organization_id: "org-1" },
    },
    data: {
      id: "sub-123",
      attributes: {
        status: "active",
        customer_id: 42,
        variant_id: 999,
        renews_at: "2027-01-01T00:00:00.000Z",
      },
    },
  };

  it("accepts a correctly signed webhook and normalizes its fields", () => {
    const { rawBody, signature } = signedPayload(samplePayload);

    const event = provider.verifyAndParseWebhook(rawBody, signature);

    expect(event.eventType).toBe("subscription_created");
    expect(event.organizationId).toBe("org-1");
    expect(event.providerCustomerId).toBe("42");
    expect(event.providerSubscriptionId).toBe("sub-123");
    expect(event.providerPriceId).toBe("999");
    expect(event.providerEventId).toEqual(expect.any(String));
  });

  it("produces the same providerEventId for an identical repeated payload (idempotency key)", () => {
    const { rawBody, signature } = signedPayload(samplePayload);
    const first = provider.verifyAndParseWebhook(rawBody, signature);
    const second = provider.verifyAndParseWebhook(rawBody, signature);
    expect(first.providerEventId).toBe(second.providerEventId);
  });

  it("rejects a payload with an invalid signature", () => {
    const { rawBody } = signedPayload(samplePayload);
    expect(() => provider.verifyAndParseWebhook(rawBody, "0".repeat(64))).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects a forged payload signed with the wrong secret", () => {
    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const forgedSignature = createHmac("sha256", "wrong-secret").update(rawBody).digest("hex");
    expect(() => provider.verifyAndParseWebhook(rawBody, forgedSignature)).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects a missing signature header", () => {
    const { rawBody } = signedPayload(samplePayload);
    expect(() => provider.verifyAndParseWebhook(rawBody, undefined)).toThrow(UnauthorizedException);
  });

  it("maps known LemonSqueezy statuses to internal SubscriptionStatus values", () => {
    expect(provider.mapProviderStatus("active")).toBe(SubscriptionStatus.ACTIVE);
    expect(provider.mapProviderStatus("past_due")).toBe(SubscriptionStatus.PAST_DUE);
    expect(provider.mapProviderStatus("cancelled")).toBe(SubscriptionStatus.CANCELING);
    expect(provider.mapProviderStatus("totally_unknown")).toBe(SubscriptionStatus.INCOMPLETE);
  });
});
