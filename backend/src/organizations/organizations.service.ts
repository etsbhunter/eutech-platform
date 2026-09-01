import { Injectable, NotFoundException } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        country: dto.country,
        memberships: {
          create: { userId, role: OrganizationRole.ORGANIZATION_OWNER },
        },
      },
    });
    return organization;
  }

  async listMine(userId: string) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: true },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      country: m.organization.country,
      role: m.role,
    }));
  }

  // Tenant isolation: only returns the organization if the caller has a real
  // membership in it. Not-found is returned for both a missing organization
  // and an organization the caller isn't a member of, so a guessed ID never
  // reveals whether it exists.
  async getByIdForUser(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: true },
    });

    if (!membership) {
      throw new NotFoundException("Organization not found.");
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      country: membership.organization.country,
      role: membership.role,
    };
  }

  // Same tenant-isolation guarantee as getByIdForUser: requires a real
  // membership before revealing anything about the organization's billing state.
  //
  // Returns one entry per subscription (i.e. per product the org has ever
  // subscribed to), not just the most recent one -- an org can hold separate
  // subscriptions to separate products. A manual-override entitlement with no
  // subscription (an admin support/testing tool, see AdminService.grantManualEntitlement)
  // isn't tied to any product and therefore won't surface here; it still
  // satisfies ProvisioningService's entitlement check for any product.
  async getSubscriptionsForUser(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Organization not found.");
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        plan: { include: { product: true } },
        price: true,
        entitlements: true,
      },
    });

    const now = new Date();

    return subscriptions.map((subscription) => ({
      productSlug: subscription.plan.product.slug,
      productName: subscription.plan.product.name,
      status: subscription.status,
      planSlug: subscription.plan.slug,
      planName: subscription.plan.name,
      interval: subscription.price.interval,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      hasActiveEntitlement: subscription.entitlements.some(
        (entitlement) => !entitlement.expiresAt || entitlement.expiresAt > now,
      ),
    }));
  }
}
