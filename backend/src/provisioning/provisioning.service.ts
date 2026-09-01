import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProvisioningStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PROVISIONING_ADAPTER, ProvisioningAdapter } from "./provisioning-adapter.interface";
import { getProductProfileSchema } from "../catalogue/product-profile-schema";

const REQUEST_ROLES = ["ORGANIZATION_OWNER", "PRODUCT_ADMIN"];
const ADAPTER_STATUS_MAP: Record<string, ProvisioningStatus> = {
  queued: ProvisioningStatus.QUEUED,
  provisioning: ProvisioningStatus.PROVISIONING,
  ready: ProvisioningStatus.READY,
  failed: ProvisioningStatus.FAILED,
};

function toPublicShape(instance: {
  provisioningStatus: ProvisioningStatus;
  workspaceId: string | null;
  accessUrl: string | null;
  failureReason: string | null;
}) {
  return {
    status: instance.provisioningStatus,
    workspaceId: instance.workspaceId,
    accessUrl: instance.accessUrl,
    failureReason: instance.failureReason,
  };
}

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROVISIONING_ADAPTER) private readonly adapter: ProvisioningAdapter,
  ) {}

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Organization not found.");
    }
    return membership;
  }

  async getStatus(userId: string, organizationId: string, productSlug: string) {
    await this.requireMembership(userId, organizationId);

    const product = await this.prisma.product.findUniqueOrThrow({
      where: { slug: productSlug },
    });
    const instance = await this.prisma.productInstance.findUnique({
      where: { organizationId_productId: { organizationId, productId: product.id } },
    });

    if (!instance) {
      return { status: ProvisioningStatus.NOT_STARTED, workspaceId: null, accessUrl: null, failureReason: null };
    }

    if (
      instance.provisioningStatus === ProvisioningStatus.QUEUED ||
      instance.provisioningStatus === ProvisioningStatus.PROVISIONING
    ) {
      return toPublicShape(await this.advance(instance));
    }

    return toPublicShape(instance);
  }

  private async advance(instance: {
    id: string;
    provisioningRequestId: string;
    provisioningStatus: ProvisioningStatus;
    workspaceId: string | null;
    accessUrl: string | null;
    failureReason: string | null;
  }) {
    const result = await this.adapter.checkStatus(instance.provisioningRequestId);
    const nextStatus = ADAPTER_STATUS_MAP[result.status];

    if (nextStatus === instance.provisioningStatus) {
      return instance;
    }

    return this.prisma.productInstance.update({
      where: { id: instance.id },
      data: {
        provisioningStatus: nextStatus,
        // Never report ready without both a workspace identifier and an
        // access URL actually being present.
        workspaceId: nextStatus === ProvisioningStatus.READY ? result.workspaceId : instance.workspaceId,
        accessUrl: nextStatus === ProvisioningStatus.READY ? result.accessUrl : instance.accessUrl,
        failureReason: nextStatus === ProvisioningStatus.FAILED ? result.failureReason : null,
      },
    });
  }

  async requestProvisioning(userId: string, organizationId: string, productSlug: string) {
    const membership = await this.requireMembership(userId, organizationId);
    if (!REQUEST_ROLES.includes(membership.role)) {
      throw new ForbiddenException("Only an owner or product admin can request provisioning.");
    }

    const product = await this.prisma.product.findUniqueOrThrow({
      where: { slug: productSlug },
    });

    const profileSchema = getProductProfileSchema(productSlug);
    const profile = await this.prisma.productProfile.findUnique({
      where: { organizationId_productId: { organizationId, productId: product.id } },
    });
    if (profileSchema.requiresProfile && !profile) {
      throw new BadRequestException("Complete the business profile before requesting provisioning.");
    }

    // A manual-override entitlement (no subscription attached -- an admin
    // support/testing grant, see AdminService.grantManualEntitlement) is not
    // tied to any product, so it satisfies this check for any product. A
    // subscription-backed entitlement must belong to the product being
    // provisioned, so an entitlement for product A can't unlock product B.
    const candidateEntitlements = await this.prisma.entitlement.findMany({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { subscription: { include: { plan: true } } },
    });
    const hasEntitlementForProduct = candidateEntitlements.some(
      (entitlement) => !entitlement.subscription || entitlement.subscription.plan.productId === product.id,
    );
    if (!hasEntitlementForProduct) {
      throw new ForbiddenException("An active subscription for this product is required before provisioning can start.");
    }

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const existing = await this.prisma.productInstance.findUnique({
      where: { organizationId_productId: { organizationId, productId: product.id } },
    });

    // Idempotent/retry-safe: an in-flight or already-ready instance is
    // returned as-is rather than starting a second provisioning job.
    if (existing && existing.provisioningStatus !== ProvisioningStatus.FAILED) {
      return toPublicShape(existing);
    }

    const instance = existing
      ? await this.prisma.productInstance.update({
          where: { id: existing.id },
          data: { provisioningStatus: ProvisioningStatus.QUEUED, failureReason: null },
        })
      : await this.prisma.productInstance.create({
          data: { organizationId, productId: product.id, provisioningStatus: ProvisioningStatus.QUEUED },
        });

    const profileData = (profile?.data ?? {}) as Record<string, unknown>;
    const result = await this.adapter.requestProvisioning({
      provisioningRequestId: instance.provisioningRequestId,
      clinicName: (profileData.registeredName as string | undefined) ?? organization.name,
      ownerName: user.fullName,
      ownerEmail: user.email,
      defaultLanguage: "en",
    });

    const updated = await this.prisma.productInstance.update({
      where: { id: instance.id },
      data: { provisioningStatus: ADAPTER_STATUS_MAP[result.status] },
    });

    return toPublicShape(updated);
  }

  // Eutech Admin operational retry: unlike requestProvisioning, this is not
  // gated on the caller being an organization member -- authorization is the
  // AdminGuard's job -- but it only ever acts on an instance that is
  // genuinely FAILED, and the caller (AdminService) is responsible for
  // writing the audit log entry.
  async adminRetryProvisioning(organizationId: string, productSlug: string) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { slug: productSlug },
    });
    const instance = await this.prisma.productInstance.findUnique({
      where: { organizationId_productId: { organizationId, productId: product.id } },
    });

    if (!instance || instance.provisioningStatus !== ProvisioningStatus.FAILED) {
      throw new BadRequestException("Only a failed provisioning instance can be retried.");
    }

    const profile = await this.prisma.productProfile.findUnique({
      where: { organizationId_productId: { organizationId, productId: product.id } },
    });
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    const ownerMembership = await this.prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId, role: "ORGANIZATION_OWNER" },
      include: { user: true },
    });

    const requeued = await this.prisma.productInstance.update({
      where: { id: instance.id },
      data: { provisioningStatus: ProvisioningStatus.QUEUED, failureReason: null },
    });

    const profileData = (profile?.data ?? {}) as Record<string, unknown>;
    const result = await this.adapter.requestProvisioning({
      provisioningRequestId: requeued.provisioningRequestId,
      clinicName: (profileData.registeredName as string | undefined) ?? organization.name,
      ownerName: ownerMembership.user.fullName,
      ownerEmail: ownerMembership.user.email,
      defaultLanguage: "en",
    });

    const updated = await this.prisma.productInstance.update({
      where: { id: instance.id },
      data: { provisioningStatus: ADAPTER_STATUS_MAP[result.status] },
    });

    return toPublicShape(updated);
  }
}
