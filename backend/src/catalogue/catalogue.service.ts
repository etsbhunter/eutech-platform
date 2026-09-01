import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return products.map((product) => ({ slug: product.slug, name: product.name }));
  }

  async getProductCatalogue(productSlug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug: productSlug },
      include: {
        plans: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            prices: true,
            planFeatures: { include: { feature: true } },
          },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException("Product not found.");
    }

    return {
      product: { slug: product.slug, name: product.name },
      plans: product.plans.map((plan) => ({
        slug: plan.slug,
        name: plan.name,
        prices: plan.prices.map((price) => ({
          interval: price.interval,
          amountMinorUnits: price.amountMinorUnits,
          currency: price.currency,
          isPlaceholder: price.isPlaceholder,
        })),
        features: plan.planFeatures.map((pf) => ({
          slug: pf.feature.slug,
          value: pf.value,
        })),
      })),
    };
  }
}
