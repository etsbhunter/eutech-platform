import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/access-token.guard";
import { OrganizationsService } from "./organizations.service";
import { ProductProfileService } from "./product-profile.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpsertProductProfileDto } from "./dto/upsert-product-profile.dto";
import { ProvisioningService } from "../provisioning/provisioning.service";

@Controller("organizations")
@UseGuards(AccessTokenGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly productProfileService: ProductProfileService,
    private readonly provisioningService: ProvisioningService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateOrganizationDto) {
    return { data: await this.organizationsService.create(user.sub, dto) };
  }

  @Get("me")
  async mine(@CurrentUser() user: AccessTokenPayload) {
    return { data: await this.organizationsService.listMine(user.sub) };
  }

  @Get(":id")
  async getById(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return { data: await this.organizationsService.getByIdForUser(user.sub, id) };
  }

  @Get(":id/subscription")
  async getSubscription(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return { data: await this.organizationsService.getSubscriptionsForUser(user.sub, id) };
  }

  @Get(":id/products/:productSlug/profile")
  async getProductProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Param("productSlug") productSlug: string,
  ) {
    return { data: await this.productProfileService.get(user.sub, id, productSlug) };
  }

  @Put(":id/products/:productSlug/profile")
  async upsertProductProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Param("productSlug") productSlug: string,
    @Body() dto: UpsertProductProfileDto,
  ) {
    return { data: await this.productProfileService.upsert(user.sub, id, productSlug, dto) };
  }

  @Get(":id/provisioning")
  async getProvisioning(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Query("product") productSlug: string,
  ) {
    return { data: await this.provisioningService.getStatus(user.sub, id, productSlug) };
  }

  @Post(":id/provisioning")
  async requestProvisioning(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Query("product") productSlug: string,
  ) {
    return { data: await this.provisioningService.requestProvisioning(user.sub, id, productSlug) };
  }
}
