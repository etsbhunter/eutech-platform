import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertProductProfileDto } from "./dto/upsert-product-profile.dto";
import { validateProductProfileData } from "../catalogue/product-profile-schema";

const EDITOR_ROLES = ["ORGANIZATION_OWNER", "PRODUCT_ADMIN"];

@Injectable()
export class ProductProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Organization not found.");
    }
    return membership;
  }

  private async resolveProduct(productSlug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product) {
      throw new NotFoundException("Product not found.");
    }
    return product;
  }

  async get(userId: string, organizationId: string, productSlug: string) {
    await this.requireMembership(userId, organizationId);
    const product = await this.resolveProduct(productSlug);
    return this.prisma.productProfile.findUnique({
      where: { organizationId_productId: { organizationId, productId: product.id } },
    });
  }

  async upsert(userId: string, organizationId: string, productSlug: string, dto: UpsertProductProfileDto) {
    const membership = await this.requireMembership(userId, organizationId);
    if (!EDITOR_ROLES.includes(membership.role)) {
      throw new ForbiddenException("Only an owner or product admin can edit the profile.");
    }
    const product = await this.resolveProduct(productSlug);

    let data: Record<string, string | number>;
    try {
      data = validateProductProfileData(productSlug, dto.data);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid profile data.");
    }

    return this.prisma.productProfile.upsert({
      where: { organizationId_productId: { organizationId, productId: product.id } },
      update: { data },
      create: { organizationId, productId: product.id, data },
    });
  }
}
