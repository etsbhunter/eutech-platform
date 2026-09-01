import { Injectable, Logger } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NormalizedWebhookEvent } from "./billing-provider.interface";

const ACCESS_GRANTING_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.GRACE_PERIOD,
  SubscriptionStatus.CANCELING,
];

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Returns { duplicate: true } for a safely-repeated event without
  // reprocessing it -- callers should still respond 200/success either way.
  async process(
    provider: string,
    event: NormalizedWebhookEvent,
    status: SubscriptionStatus,
  ): Promise<{ duplicate: boolean }> {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          provider,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
          processingStatus: "processing",
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        this.logger.log(`Duplicate webhook event ignored: ${provider}/${event.providerEventId}`);
        return { duplicate: true };
      }
      throw error;
    }

    try {
      await this.applySubscriptionChange(provider, event, status);
      await this.prisma.webhookEvent.update({
        where: { provider_providerEventId: { provider, providerEventId: event.providerEventId } },
        data: { processingStatus: "processed", processedAt: new Date() },
      });
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: { provider_providerEventId: { provider, providerEventId: event.providerEventId } },
        data: {
          processingStatus: "failed",
          failureReason: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }

    return { duplicate: false };
  }

  private async applySubscriptionChange(
    provider: string,
    event: NormalizedWebhookEvent,
    status: SubscriptionStatus,
  ) {
    let organizationId = event.organizationId;
    if (!organizationId) {
      const billingCustomer = await this.prisma.billingCustomer.findFirst({
        where: { provider, providerCustomerId: event.providerCustomerId },
      });
      if (!billingCustomer) {
        throw new Error(
          `No organization found for provider customer ${event.providerCustomerId}`,
        );
      }
      organizationId = billingCustomer.organizationId;
    }

    await this.prisma.billingCustomer.upsert({
      where: { organizationId },
      update: { providerCustomerId: event.providerCustomerId },
      create: { organizationId, provider, providerCustomerId: event.providerCustomerId },
    });

    const price = event.providerPriceId
      ? await this.prisma.price.findFirst({
          where: { providerPriceId: event.providerPriceId },
          include: { plan: true },
        })
      : event.planSlug && event.interval
        ? await this.prisma.price.findFirst({
            where: {
              interval: event.interval,
              plan: {
                slug: event.planSlug,
                ...(event.productSlug ? { product: { slug: event.productSlug } } : {}),
              },
            },
            include: { plan: true },
          })
        : null;

    if (!price) {
      throw new Error("Could not resolve a plan/price for this webhook event.");
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { providerSubscriptionId: event.providerSubscriptionId },
      update: {
        status,
        planId: price.planId,
        priceId: price.id,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: status === SubscriptionStatus.CANCELING,
      },
      create: {
        organizationId,
        planId: price.planId,
        priceId: price.id,
        status,
        providerSubscriptionId: event.providerSubscriptionId,
        currentPeriodEnd: event.currentPeriodEnd,
      },
    });

    const existingEntitlement = await this.prisma.entitlement.findFirst({
      where: { subscriptionId: subscription.id, isManualOverride: false },
    });

    const shouldHaveAccess = ACCESS_GRANTING_STATUSES.includes(status);

    if (shouldHaveAccess && !existingEntitlement) {
      await this.prisma.entitlement.create({
        data: { organizationId, subscriptionId: subscription.id },
      });
    } else if (shouldHaveAccess && existingEntitlement?.expiresAt) {
      await this.prisma.entitlement.update({
        where: { id: existingEntitlement.id },
        data: { expiresAt: null },
      });
    } else if (!shouldHaveAccess && existingEntitlement && !existingEntitlement.expiresAt) {
      await this.prisma.entitlement.update({
        where: { id: existingEntitlement.id },
        data: { expiresAt: new Date() },
      });
    }
  }
}
