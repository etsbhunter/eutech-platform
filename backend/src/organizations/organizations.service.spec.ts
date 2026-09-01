import { NotFoundException } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { OrganizationsService } from "./organizations.service";
import { PrismaService } from "../prisma/prisma.service";

describe("OrganizationsService", () => {
  let service: OrganizationsService;
  let prisma: {
    organization: { create: jest.Mock };
    organizationMembership: { findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      organization: { create: jest.fn() },
      organizationMembership: { findMany: jest.fn(), findUnique: jest.fn() },
    };
    service = new OrganizationsService(prisma as unknown as PrismaService);
  });

  it("creates an organization and makes the creator its owner", async () => {
    prisma.organization.create.mockResolvedValueOnce({
      id: "org-1",
      name: "Sunshine Clinic",
      country: "SG",
    });

    await service.create("user-1", { name: "Sunshine Clinic", country: "SG" });

    expect(prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Sunshine Clinic",
          memberships: {
            create: { userId: "user-1", role: OrganizationRole.ORGANIZATION_OWNER },
          },
        }),
      }),
    );
  });

  describe("tenant isolation", () => {
    it("returns an organization for a user with a real membership", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({
        role: OrganizationRole.ORGANIZATION_OWNER,
        organization: { id: "org-1", name: "Sunshine Clinic", country: "SG" },
      });

      const result = await service.getByIdForUser("user-1", "org-1");

      expect(result.id).toBe("org-1");
      expect(prisma.organizationMembership.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_organizationId: { userId: "user-1", organizationId: "org-1" } },
        }),
      );
    });

    it("refuses to return another user's organization, even if it exists", async () => {
      // No membership row exists for this (user, organization) pair.
      prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);

      await expect(service.getByIdForUser("user-2", "org-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("returns the same not-found error for a nonexistent organization", async () => {
      prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);

      await expect(service.getByIdForUser("user-1", "org-does-not-exist")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
