import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProvisioningStatus } from "@prisma/client";
import { ProvisioningService } from "./provisioning.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProvisioningAdapter } from "./provisioning-adapter.interface";

describe("ProvisioningService", () => {
  let service: ProvisioningService;
  let prisma: {
    organizationMembership: { findUnique: jest.Mock };
    productProfile: { findUnique: jest.Mock };
    entitlement: { findMany: jest.Mock };
    organization: { findUniqueOrThrow: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
    product: { findUniqueOrThrow: jest.Mock };
    productInstance: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let adapter: { requestProvisioning: jest.Mock; checkStatus: jest.Mock };

  beforeEach(() => {
    prisma = {
      organizationMembership: { findUnique: jest.fn() },
      productProfile: { findUnique: jest.fn() },
      entitlement: { findMany: jest.fn() },
      organization: { findUniqueOrThrow: jest.fn() },
      user: { findUniqueOrThrow: jest.fn() },
      product: { findUniqueOrThrow: jest.fn() },
      productInstance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    adapter = { requestProvisioning: jest.fn(), checkStatus: jest.fn() };
    service = new ProvisioningService(
      prisma as unknown as PrismaService,
      adapter as unknown as ProvisioningAdapter,
    );
  });

  describe("requestProvisioning", () => {
    const setupHappyPath = () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
      prisma.productProfile.findUnique.mockResolvedValueOnce({ data: { registeredName: "Sunshine Clinic" } });
      prisma.entitlement.findMany.mockResolvedValueOnce([
        { id: "ent-1", subscription: { plan: { productId: "product-1" } } },
      ]);
      prisma.organization.findUniqueOrThrow.mockResolvedValueOnce({ id: "org-1", name: "Sunshine" });
      prisma.user.findUniqueOrThrow.mockResolvedValueOnce({ fullName: "Jane", email: "jane@example.com" });
    };

    it("rejects a non-member", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.requestProvisioning("user-1", "org-1", "eutech-clinic"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects a member without owner/product-admin role", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "BILLING_ADMIN" });
      await expect(
        service.requestProvisioning("user-1", "org-1", "eutech-clinic"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("requires a product profile before provisioning when the product requires one", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
      prisma.productProfile.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.requestProvisioning("user-1", "org-1", "eutech-clinic"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("requires an active entitlement for this product before provisioning", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
      prisma.productProfile.findUnique.mockResolvedValueOnce({ data: { registeredName: "Sunshine Clinic" } });
      prisma.entitlement.findMany.mockResolvedValueOnce([]);
      await expect(
        service.requestProvisioning("user-1", "org-1", "eutech-clinic"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects an entitlement that only covers a different product", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
      prisma.productProfile.findUnique.mockResolvedValueOnce({ data: { registeredName: "Sunshine Clinic" } });
      prisma.entitlement.findMany.mockResolvedValueOnce([
        { id: "ent-1", subscription: { plan: { productId: "some-other-product" } } },
      ]);
      await expect(
        service.requestProvisioning("user-1", "org-1", "eutech-clinic"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("accepts a manual-override entitlement with no subscription for any product", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
      prisma.productProfile.findUnique.mockResolvedValueOnce({ data: { registeredName: "Sunshine Clinic" } });
      prisma.entitlement.findMany.mockResolvedValueOnce([{ id: "ent-1", subscription: null }]);
      prisma.organization.findUniqueOrThrow.mockResolvedValueOnce({ id: "org-1", name: "Sunshine" });
      prisma.user.findUniqueOrThrow.mockResolvedValueOnce({ fullName: "Jane", email: "jane@example.com" });
      prisma.productInstance.findUnique.mockResolvedValueOnce(null);
      prisma.productInstance.create.mockResolvedValueOnce({
        id: "pi-1",
        provisioningRequestId: "req-1",
        provisioningStatus: ProvisioningStatus.QUEUED,
      });
      adapter.requestProvisioning.mockResolvedValueOnce({ status: "provisioning" });
      prisma.productInstance.update.mockResolvedValueOnce({
        provisioningStatus: ProvisioningStatus.PROVISIONING,
        workspaceId: null,
        accessUrl: null,
        failureReason: null,
      });

      const result = await service.requestProvisioning("user-1", "org-1", "eutech-clinic");
      expect(result.status).toBe(ProvisioningStatus.PROVISIONING);
    });

    it("creates a new ProductInstance and calls the adapter on first request", async () => {
      setupHappyPath();
      prisma.productInstance.findUnique.mockResolvedValueOnce(null);
      prisma.productInstance.create.mockResolvedValueOnce({
        id: "pi-1",
        provisioningRequestId: "req-1",
        provisioningStatus: ProvisioningStatus.QUEUED,
      });
      adapter.requestProvisioning.mockResolvedValueOnce({ status: "provisioning" });
      prisma.productInstance.update.mockResolvedValueOnce({
        provisioningStatus: ProvisioningStatus.PROVISIONING,
        workspaceId: null,
        accessUrl: null,
        failureReason: null,
      });

      const result = await service.requestProvisioning("user-1", "org-1", "eutech-clinic");

      expect(adapter.requestProvisioning).toHaveBeenCalledWith(
        expect.objectContaining({ provisioningRequestId: "req-1", clinicName: "Sunshine Clinic" }),
      );
      expect(result.status).toBe(ProvisioningStatus.PROVISIONING);
    });

    it("is idempotent: a second request while already in-flight does not call the adapter again", async () => {
      setupHappyPath();
      prisma.productInstance.findUnique.mockResolvedValueOnce({
        id: "pi-1",
        provisioningStatus: ProvisioningStatus.PROVISIONING,
        workspaceId: null,
        accessUrl: null,
        failureReason: null,
      });

      const result = await service.requestProvisioning("user-1", "org-1", "eutech-clinic");

      expect(adapter.requestProvisioning).not.toHaveBeenCalled();
      expect(prisma.productInstance.create).not.toHaveBeenCalled();
      expect(result.status).toBe(ProvisioningStatus.PROVISIONING);
    });

    it("allows retrying a FAILED instance, reusing the same provisioningRequestId", async () => {
      setupHappyPath();
      prisma.productInstance.findUnique.mockResolvedValueOnce({
        id: "pi-1",
        provisioningRequestId: "req-1",
        provisioningStatus: ProvisioningStatus.FAILED,
      });
      prisma.productInstance.update
        .mockResolvedValueOnce({
          id: "pi-1",
          provisioningRequestId: "req-1",
          provisioningStatus: ProvisioningStatus.QUEUED,
        })
        .mockResolvedValueOnce({
          provisioningStatus: ProvisioningStatus.PROVISIONING,
          workspaceId: null,
          accessUrl: null,
          failureReason: null,
        });
      adapter.requestProvisioning.mockResolvedValueOnce({ status: "provisioning" });

      await service.requestProvisioning("user-1", "org-1", "eutech-clinic");

      expect(adapter.requestProvisioning).toHaveBeenCalledWith(
        expect.objectContaining({ provisioningRequestId: "req-1" }),
      );
    });
  });

  describe("getStatus", () => {
    it("returns NOT_STARTED when no instance exists", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1" });
      prisma.productInstance.findUnique.mockResolvedValueOnce(null);

      const result = await service.getStatus("user-1", "org-1", "eutech-clinic");
      expect(result.status).toBe(ProvisioningStatus.NOT_STARTED);
    });

    it("only reports READY once the adapter confirms a workspace and access URL", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1" });
      prisma.productInstance.findUnique.mockResolvedValueOnce({
        id: "pi-1",
        provisioningRequestId: "req-1",
        provisioningStatus: ProvisioningStatus.PROVISIONING,
        workspaceId: null,
        accessUrl: null,
        failureReason: null,
      });
      adapter.checkStatus.mockResolvedValueOnce({ status: "provisioning" });

      const stillProvisioning = await service.getStatus("user-1", "org-1", "eutech-clinic");
      expect(stillProvisioning.status).toBe(ProvisioningStatus.PROVISIONING);
      expect(stillProvisioning.accessUrl).toBeNull();
    });

    it("transitions to READY and stores workspaceId/accessUrl once the adapter reports ready", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
      prisma.product.findUniqueOrThrow.mockResolvedValueOnce({ id: "product-1" });
      prisma.productInstance.findUnique.mockResolvedValueOnce({
        id: "pi-1",
        provisioningRequestId: "req-1",
        provisioningStatus: ProvisioningStatus.PROVISIONING,
        workspaceId: null,
        accessUrl: null,
        failureReason: null,
      });
      adapter.checkStatus.mockResolvedValueOnce({
        status: "ready",
        workspaceId: "ws-1",
        accessUrl: "https://clinic-platform.test/workspaces/req-1",
      });
      prisma.productInstance.update.mockResolvedValueOnce({
        provisioningStatus: ProvisioningStatus.READY,
        workspaceId: "ws-1",
        accessUrl: "https://clinic-platform.test/workspaces/req-1",
        failureReason: null,
      });

      const result = await service.getStatus("user-1", "org-1", "eutech-clinic");

      expect(result.status).toBe(ProvisioningStatus.READY);
      expect(result.workspaceId).toBe("ws-1");
      expect(result.accessUrl).toBe("https://clinic-platform.test/workspaces/req-1");
    });
  });
});
