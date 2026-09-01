import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { BillingService } from "./billing.service";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookProcessorService } from "./webhook-processor.service";
import { BillingProvider } from "./billing-provider.interface";
import { LemonSqueezyBillingProvider } from "./lemonsqueezy-billing.provider";

describe("BillingService", () => {
  let service: BillingService;
  let prisma: {
    organizationMembership: { findUnique: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
    billingCustomer: { findUnique: jest.Mock };
    organization: { findUnique: jest.Mock };
    plan: { findFirst: jest.Mock };
  };
  let provider: { createCheckoutSession: jest.Mock; createPortalSession: jest.Mock };
  let webhookProcessor: { process: jest.Mock };

  beforeEach(() => {
    prisma = {
      organizationMembership: { findUnique: jest.fn() },
      user: { findUniqueOrThrow: jest.fn() },
      billingCustomer: { findUnique: jest.fn() },
      organization: { findUnique: jest.fn() },
      plan: { findFirst: jest.fn() },
    };
    provider = { createCheckoutSession: jest.fn(), createPortalSession: jest.fn() };
    webhookProcessor = { process: jest.fn() };
    service = new BillingService(
      provider as unknown as BillingProvider,
      {} as unknown as LemonSqueezyBillingProvider,
      prisma as unknown as PrismaService,
      webhookProcessor as unknown as WebhookProcessorService,
    );
  });

  describe("createCheckout", () => {
    const checkoutDto = {
      organizationId: "org-1",
      productSlug: "eutech-clinic",
      planSlug: "starter",
      interval: "MONTHLY" as const,
    };

    it("rejects a user who is not a member of the organization", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);

      await expect(service.createCheckout("user-1", checkoutDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("rejects a member without owner/billing-admin role", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "PRODUCT_ADMIN" });

      await expect(service.createCheckout("user-1", checkoutDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("404s when the plan doesn't belong to the given product", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.plan.findFirst.mockResolvedValueOnce(null);

      await expect(service.createCheckout("user-1", checkoutDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("creates a checkout session for an organization owner", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.plan.findFirst.mockResolvedValueOnce({ id: "plan-1", slug: "starter" });
      prisma.user.findUniqueOrThrow.mockResolvedValueOnce({ email: "owner@example.com" });
      provider.createCheckoutSession.mockResolvedValueOnce({ url: "https://checkout.example" });

      const result = await service.createCheckout("user-1", checkoutDto);

      expect(result.url).toBe("https://checkout.example");
      expect(provider.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          productSlug: "eutech-clinic",
          planSlug: "starter",
          interval: "MONTHLY",
        }),
      );
    });
  });

  describe("completeFakeCheckout", () => {
    const fakeCheckoutDto = {
      checkoutId: "c-1",
      organizationId: "org-1",
      productSlug: "eutech-clinic",
      planSlug: "starter",
      interval: "MONTHLY" as const,
    };

    it("refuses to run when the active provider is not fake", async () => {
      process.env.BILLING_PROVIDER = "lemonsqueezy";
      await expect(service.completeFakeCheckout(fakeCheckoutDto)).rejects.toThrow(/fake mode/);
      delete process.env.BILLING_PROVIDER;
    });

    it("processes the simulated event through the shared webhook processor when in fake mode", async () => {
      prisma.organization.findUnique.mockResolvedValueOnce({ id: "org-1" });
      webhookProcessor.process.mockResolvedValueOnce({ duplicate: false });

      const result = await service.completeFakeCheckout(fakeCheckoutDto);

      expect(result.duplicate).toBe(false);
      expect(webhookProcessor.process).toHaveBeenCalledWith(
        "fake",
        expect.objectContaining({ providerEventId: "c-1", organizationId: "org-1", productSlug: "eutech-clinic" }),
        SubscriptionStatus.ACTIVE,
      );
    });
  });
});
