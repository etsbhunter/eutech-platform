import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BILLING_PROVIDER, BillingProvider } from "./billing-provider.interface";
import { WebhookProcessorService } from "./webhook-processor.service";
import { LemonSqueezyBillingProvider } from "./lemonsqueezy-billing.provider";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { CreatePortalDto } from "./dto/create-portal.dto";
import { FakeCompleteCheckoutDto } from "./dto/fake-complete-checkout.dto";
import { getPrimaryFrontendOrigin } from "../common/frontend-origin";

@Injectable()
export class BillingService {
  constructor(
    @Inject(BILLING_PROVIDER) private readonly provider: BillingProvider,
    // The webhook receiver at /billing/webhooks/lemonsqueezy always verifies
    // against LemonSqueezy specifically, regardless of which provider is
    // currently active for checkout/portal (e.g. "fake" in local dev) --
    // it is that provider's webhook format, not a generic one.
    private readonly lemonSqueezyProvider: LemonSqueezyBillingProvider,
    private readonly prisma: PrismaService,
    private readonly webhookProcessor: WebhookProcessorService,
  ) {}

  get providerName(): string {
    return process.env.BILLING_PROVIDER ?? "fake";
  }

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Organization not found.");
    }
    return membership;
  }

  async createCheckout(userId: string, dto: CreateCheckoutDto) {
    const membership = await this.requireMembership(userId, dto.organizationId);
    if (!["ORGANIZATION_OWNER", "BILLING_ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("Only an owner or billing admin can start checkout.");
    }

    const plan = await this.prisma.plan.findFirst({
      where: { slug: dto.planSlug, product: { slug: dto.productSlug } },
    });
    if (!plan) {
      throw new NotFoundException("Plan not found for this product.");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const frontendOrigin = getPrimaryFrontendOrigin();

    return this.provider.createCheckoutSession({
      organizationId: dto.organizationId,
      productSlug: dto.productSlug,
      planSlug: dto.planSlug,
      interval: dto.interval,
      customerEmail: user.email,
      successUrl: `${frontendOrigin}/account?checkout=success`,
    });
  }

  async createPortal(userId: string, dto: CreatePortalDto) {
    const membership = await this.requireMembership(userId, dto.organizationId);
    if (!["ORGANIZATION_OWNER", "BILLING_ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("Only an owner or billing admin can open the billing portal.");
    }

    const billingCustomer = await this.prisma.billingCustomer.findUnique({
      where: { organizationId: dto.organizationId },
    });
    if (!billingCustomer) {
      throw new NotFoundException("No billing customer exists for this organization yet.");
    }

    return this.provider.createPortalSession(billingCustomer.providerCustomerId);
  }

  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
    const event = this.lemonSqueezyProvider.verifyAndParseWebhook(rawBody, signatureHeader);
    const status = this.lemonSqueezyProvider.mapProviderStatus(event.providerStatus);
    return this.webhookProcessor.process("lemonsqueezy", event, status);
  }

  // Dev/local only: simulates the fake provider's "webhook" without any real
  // network call. Access is still only granted through this explicit
  // server-side call, never from the browser redirect alone.
  async completeFakeCheckout(dto: FakeCompleteCheckoutDto) {
    if (this.providerName !== "fake") {
      throw new BadRequestException("Fake checkout completion is only available in fake mode.");
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const status = SubscriptionStatus.ACTIVE;
    return this.webhookProcessor.process(
      "fake",
      {
        providerEventId: dto.checkoutId,
        eventType: "fake.checkout.completed",
        organizationId: dto.organizationId,
        providerCustomerId: `fake-customer-${dto.organizationId}`,
        providerSubscriptionId: `fake-subscription-${dto.checkoutId}`,
        providerStatus: "ACTIVE",
        productSlug: dto.productSlug,
        planSlug: dto.planSlug,
        interval: dto.interval as "MONTHLY" | "ANNUAL",
      },
      status,
    );
  }
}
