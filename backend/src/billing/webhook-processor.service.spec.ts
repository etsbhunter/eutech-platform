import { Prisma, SubscriptionStatus } from "@prisma/client";
import { WebhookProcessorService } from "./webhook-processor.service";
import { PrismaService } from "../prisma/prisma.service";
import { NormalizedWebhookEvent } from "./billing-provider.interface";

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

describe("WebhookProcessorService", () => {
  let service: WebhookProcessorService;
  let prisma: {
    webhookEvent: { create: jest.Mock; update: jest.Mock };
    billingCustomer: { findFirst: jest.Mock; upsert: jest.Mock };
    price: { findFirst: jest.Mock };
    subscription: { upsert: jest.Mock };
    entitlement: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const baseEvent: NormalizedWebhookEvent = {
    providerEventId: "evt-1",
    eventType: "subscription.updated",
    organizationId: "org-1",
    providerCustomerId: "cust-1",
    providerSubscriptionId: "sub-1",
    providerStatus: "active",
    planSlug: "starter",
    interval: "MONTHLY",
  };

  beforeEach(() => {
    prisma = {
      webhookEvent: { create: jest.fn(), update: jest.fn() },
      billingCustomer: { findFirst: jest.fn(), upsert: jest.fn() },
      price: { findFirst: jest.fn() },
      subscription: { upsert: jest.fn() },
      entitlement: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    service = new WebhookProcessorService(prisma as unknown as PrismaService);
  });

  it("processes a new event and grants an entitlement for an access-granting status", async () => {
    prisma.webhookEvent.create.mockResolvedValueOnce({});
    prisma.billingCustomer.upsert.mockResolvedValueOnce({});
    prisma.price.findFirst.mockResolvedValueOnce({
      id: "price-1",
      planId: "plan-1",
      plan: { id: "plan-1", slug: "starter" },
    });
    prisma.subscription.upsert.mockResolvedValueOnce({ id: "sub-row-1" });
    prisma.entitlement.findFirst.mockResolvedValueOnce(null);
    prisma.webhookEvent.update.mockResolvedValueOnce({});

    const result = await service.process("fake", baseEvent, SubscriptionStatus.ACTIVE);

    expect(result.duplicate).toBe(false);
    expect(prisma.entitlement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { organizationId: "org-1", subscriptionId: "sub-row-1" } }),
    );
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ processingStatus: "processed" }) }),
    );
  });

  it("does not reprocess a duplicate event (same providerEventId)", async () => {
    prisma.webhookEvent.create.mockRejectedValueOnce(uniqueConstraintError());

    const result = await service.process("fake", baseEvent, SubscriptionStatus.ACTIVE);

    expect(result.duplicate).toBe(true);
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.entitlement.create).not.toHaveBeenCalled();
  });

  it("revokes an existing entitlement when the subscription is canceled", async () => {
    prisma.webhookEvent.create.mockResolvedValueOnce({});
    prisma.billingCustomer.upsert.mockResolvedValueOnce({});
    prisma.price.findFirst.mockResolvedValueOnce({
      id: "price-1",
      planId: "plan-1",
      plan: { id: "plan-1", slug: "starter" },
    });
    prisma.subscription.upsert.mockResolvedValueOnce({ id: "sub-row-1" });
    prisma.entitlement.findFirst.mockResolvedValueOnce({ id: "ent-1", expiresAt: null });
    prisma.webhookEvent.update.mockResolvedValueOnce({});

    await service.process("fake", baseEvent, SubscriptionStatus.CANCELED);

    expect(prisma.entitlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ent-1" },
        data: { expiresAt: expect.any(Date) },
      }),
    );
  });

  it("marks the webhook event failed and rethrows if the plan/price cannot be resolved", async () => {
    prisma.webhookEvent.create.mockResolvedValueOnce({});
    prisma.billingCustomer.upsert.mockResolvedValueOnce({});
    prisma.price.findFirst.mockResolvedValueOnce(null);
    prisma.webhookEvent.update.mockResolvedValueOnce({});

    await expect(service.process("fake", baseEvent, SubscriptionStatus.ACTIVE)).rejects.toThrow(
      /Could not resolve/,
    );
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ processingStatus: "failed" }) }),
    );
  });
});
