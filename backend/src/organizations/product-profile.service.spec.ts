import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProductProfileService } from "./product-profile.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ProductProfileService", () => {
  let service: ProductProfileService;
  let prisma: {
    organizationMembership: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    productProfile: { findUnique: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      organizationMembership: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      productProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new ProductProfileService(prisma as unknown as PrismaService);
  });

  it("rejects a non-member trying to read the profile", async () => {
    prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);
    await expect(service.get("user-1", "org-1", "eutech-clinic")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("404s for an unknown product", async () => {
    prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "BILLING_ADMIN" });
    prisma.product.findUnique.mockResolvedValueOnce(null);
    await expect(service.get("user-1", "org-1", "no-such-product")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("allows any member to read the profile", async () => {
    prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "BILLING_ADMIN" });
    prisma.product.findUnique.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
    prisma.productProfile.findUnique.mockResolvedValueOnce({
      data: { registeredName: "Sunshine Clinic" },
    });
    const result = await service.get("user-1", "org-1", "eutech-clinic");
    expect((result?.data as { registeredName: string }).registeredName).toBe("Sunshine Clinic");
  });

  it("rejects a billing admin trying to edit the profile", async () => {
    prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "BILLING_ADMIN" });
    prisma.product.findUnique.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
    await expect(
      service.upsert("user-1", "org-1", "eutech-clinic", { data: { registeredName: "X" } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.productProfile.upsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown field for the product's schema", async () => {
    prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
    prisma.product.findUnique.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
    prisma.productProfile.upsert.mockResolvedValueOnce({ data: {} });
    await expect(
      service.upsert("user-1", "org-1", "eutech-clinic", { data: { notAField: "x" } as never }),
    ).resolves.toBeDefined();
    // Unknown keys are silently dropped rather than rejected -- assert none leaked through.
    expect(prisma.productProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { data: {} } }),
    );
  });

  it("allows an owner to edit the profile", async () => {
    prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: "ORGANIZATION_OWNER" });
    prisma.product.findUnique.mockResolvedValueOnce({ id: "product-1", slug: "eutech-clinic" });
    prisma.productProfile.upsert.mockResolvedValueOnce({ data: { registeredName: "Sunshine Clinic" } });

    await service.upsert("user-1", "org-1", "eutech-clinic", {
      data: { registeredName: "Sunshine Clinic" },
    });

    expect(prisma.productProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_productId: { organizationId: "org-1", productId: "product-1" } },
      }),
    );
  });
});
