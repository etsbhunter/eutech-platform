import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProvisioningService } from "../provisioning/provisioning.service";

describe("AdminService", () => {
  let service: AdminService;
  let prisma: {
    demoRequest: { count: jest.Mock; findMany: jest.Mock };
    subscription: { count: jest.Mock };
    productInstance: { count: jest.Mock };
    organization: { findMany: jest.Mock; count: jest.Mock };
    entitlement: { create: jest.Mock };
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };
  let provisioningService: { adminRetryProvisioning: jest.Mock };

  beforeEach(() => {
    prisma = {
      demoRequest: { count: jest.fn(), findMany: jest.fn() },
      subscription: { count: jest.fn() },
      productInstance: { count: jest.fn() },
      organization: { findMany: jest.fn(), count: jest.fn() },
      entitlement: { create: jest.fn() },
      auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };
    provisioningService = { adminRetryProvisioning: jest.fn() };
    service = new AdminService(
      prisma as unknown as PrismaService,
      provisioningService as unknown as ProvisioningService,
    );
  });

  it("aggregates dashboard counts from independent queries", async () => {
    prisma.demoRequest.count.mockResolvedValueOnce(5);
    prisma.subscription.count
      .mockResolvedValueOnce(2) // trialing
      .mockResolvedValueOnce(10) // active
      .mockResolvedValueOnce(1); // past due
    prisma.productInstance.count.mockResolvedValueOnce(3);

    const result = await service.getDashboard();

    expect(result).toEqual({
      demoRequests: 5,
      trialing: 2,
      active: 10,
      pastDue: 1,
      provisioningFailed: 3,
    });
  });

  it("applies default pagination bounds when listing organizations", async () => {
    prisma.organization.findMany.mockResolvedValueOnce([]);
    prisma.organization.count.mockResolvedValueOnce(0);

    const result = await service.listOrganizations({});

    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("shapes owner email, subscription status and provisioning status per organization", async () => {
    prisma.organization.findMany.mockResolvedValueOnce([
      {
        id: "org-1",
        name: "Sunshine Clinic",
        country: "SG",
        subscriptions: [{ status: "ACTIVE", plan: { product: { name: "Eutech Clinic" } } }],
        productInstances: [{ provisioningStatus: "READY", product: { name: "Eutech Clinic" } }],
        memberships: [{ user: { email: "owner@example.com" } }],
      },
    ]);
    prisma.organization.count.mockResolvedValueOnce(1);

    const result = await service.listOrganizations({});

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "org-1",
        ownerEmail: "owner@example.com",
        productName: "Eutech Clinic",
        subscriptionStatus: "ACTIVE",
        provisioningStatus: "READY",
      }),
    );
  });

  it("writes an audit log entry when retrying provisioning", async () => {
    provisioningService.adminRetryProvisioning.mockResolvedValueOnce({ status: "PROVISIONING" });
    prisma.auditLog.create.mockResolvedValueOnce({});

    await service.retryProvisioning("admin-1", "org-1", "eutech-clinic");

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: "admin-1",
          organizationId: "org-1",
          action: "provisioning.retry",
        }),
      }),
    );
  });

  it("writes an audit log entry with reason and expiry when granting a manual entitlement", async () => {
    prisma.entitlement.create.mockResolvedValueOnce({ id: "ent-1" });
    prisma.auditLog.create.mockResolvedValueOnce({});

    await service.grantManualEntitlement("admin-1", "org-1", {
      reason: "Customer support goodwill credit",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    expect(prisma.entitlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isManualOverride: true,
          grantedByUserId: "admin-1",
          reason: "Customer support goodwill credit",
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "entitlement.manual_grant",
          targetId: "ent-1",
        }),
      }),
    );
  });
});
