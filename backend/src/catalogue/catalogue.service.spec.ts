import { NotFoundException } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CatalogueService", () => {
  let service: CatalogueService;
  let prisma: { product: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { product: { findUnique: jest.fn() } };
    service = new CatalogueService(prisma as unknown as PrismaService);
  });

  it("throws not found for a missing or inactive product", async () => {
    prisma.product.findUnique.mockResolvedValueOnce(null);
    await expect(service.getProductCatalogue("does-not-exist")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("shapes plans, prices and features for the frontend, omitting Enterprise's self-serve price", async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      slug: "eutech-clinic",
      name: "Eutech Clinic",
      isActive: true,
      plans: [
        {
          slug: "starter",
          name: "Starter",
          prices: [
            { interval: "MONTHLY", amountMinorUnits: 4900, currency: "USD", isPlaceholder: true },
          ],
          planFeatures: [{ value: "1", feature: { slug: "branch_limit" } }],
        },
        {
          slug: "enterprise",
          name: "Enterprise",
          prices: [],
          planFeatures: [{ value: "Unlimited", feature: { slug: "branch_limit" } }],
        },
      ],
    });

    const result = await service.getProductCatalogue("eutech-clinic");

    expect(result.plans).toHaveLength(2);
    const enterprise = result.plans.find((p) => p.slug === "enterprise");
    expect(enterprise?.prices).toHaveLength(0);
    const starter = result.plans.find((p) => p.slug === "starter");
    expect(starter?.prices[0]).toEqual(
      expect.objectContaining({ interval: "MONTHLY", amountMinorUnits: 4900, isPlaceholder: true }),
    );
    expect(starter?.features[0]).toEqual({ slug: "branch_limit", value: "1" });
  });
});
