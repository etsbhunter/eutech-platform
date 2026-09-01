import { Injectable } from "@nestjs/common";
import { ProvisioningStatus, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProvisioningService } from "../provisioning/provisioning.service";
import { ListQueryDto } from "./dto/list-query.dto";
import { GrantEntitlementDto } from "./dto/grant-entitlement.dto";

const DEFAULT_TAKE = 20;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioningService: ProvisioningService,
  ) {}

  async getDashboard() {
    const [demoRequests, trialing, active, pastDue, provisioningFailed] = await Promise.all([
      this.prisma.demoRequest.count(),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.productInstance.count({ where: { provisioningStatus: ProvisioningStatus.FAILED } }),
    ]);

    return { demoRequests, trialing, active, pastDue, provisioningFailed };
  }

  async listOrganizations(query: ListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? DEFAULT_TAKE;
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            {
              memberships: {
                some: { user: { email: { contains: query.search, mode: "insensitive" as const } } },
              },
            },
          ],
        }
      : {};

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: { include: { product: true } } } },
          productInstances: { include: { product: true } },
          memberships: {
            where: { role: "ORGANIZATION_OWNER" },
            include: { user: true },
            take: 1,
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      total,
      skip,
      take,
      items: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        country: org.country,
        ownerEmail: org.memberships[0]?.user.email ?? null,
        productName: org.subscriptions[0]?.plan.product.name ?? null,
        subscriptionStatus: org.subscriptions[0]?.status ?? null,
        provisioningStatus: org.productInstances[0]?.provisioningStatus ?? "NOT_STARTED",
      })),
    };
  }

  async getOrganizationDetail(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: { include: { user: true } },
        productProfiles: { include: { product: true } },
        subscriptions: {
          include: { plan: { include: { product: true } }, price: true },
          orderBy: { createdAt: "desc" },
        },
        entitlements: { orderBy: { createdAt: "desc" } },
        productInstances: { include: { product: true } },
      },
    });
  }

  async listDemoRequests(query: ListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? DEFAULT_TAKE;
    const where = query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: "insensitive" as const } },
            { businessEmail: { contains: query.search, mode: "insensitive" as const } },
            { companyName: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.demoRequest.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      this.prisma.demoRequest.count({ where }),
    ]);

    return { total, skip, take, items };
  }

  async listWebhookEvents(query: ListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? DEFAULT_TAKE;
    const where = query.search
      ? {
          OR: [
            { provider: { contains: query.search, mode: "insensitive" as const } },
            { eventType: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({ where, skip, take, orderBy: { receivedAt: "desc" } }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return { total, skip, take, items };
  }

  async listAuditLogs(query: ListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? DEFAULT_TAKE;
    const where = query.search
      ? { action: { contains: query.search, mode: "insensitive" as const } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { total, skip, take, items };
  }

  async retryProvisioning(adminUserId: string, organizationId: string, productSlug: string) {
    const result = await this.provisioningService.adminRetryProvisioning(organizationId, productSlug);

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        organizationId,
        action: "provisioning.retry",
        targetType: "ProductInstance",
        targetId: organizationId,
      },
    });

    return result;
  }

  async grantManualEntitlement(adminUserId: string, organizationId: string, dto: GrantEntitlementDto) {
    const entitlement = await this.prisma.entitlement.create({
      data: {
        organizationId,
        isManualOverride: true,
        grantedByUserId: adminUserId,
        reason: dto.reason,
        expiresAt: new Date(dto.expiresAt),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        organizationId,
        action: "entitlement.manual_grant",
        targetType: "Entitlement",
        targetId: entitlement.id,
        metadata: { reason: dto.reason, expiresAt: dto.expiresAt },
      },
    });

    return entitlement;
  }
}
