import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/access-token.guard";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";
import { ListQueryDto } from "./dto/list-query.dto";
import { GrantEntitlementDto } from "./dto/grant-entitlement.dto";

@Controller("admin")
@UseGuards(AccessTokenGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  async dashboard() {
    return { data: await this.adminService.getDashboard() };
  }

  @Get("organizations")
  async organizations(@Query() query: ListQueryDto) {
    return { data: await this.adminService.listOrganizations(query) };
  }

  @Get("organizations/:id")
  async organizationDetail(@Param("id") id: string) {
    return { data: await this.adminService.getOrganizationDetail(id) };
  }

  @Get("demo-requests")
  async demoRequests(@Query() query: ListQueryDto) {
    return { data: await this.adminService.listDemoRequests(query) };
  }

  @Get("webhook-events")
  async webhookEvents(@Query() query: ListQueryDto) {
    return { data: await this.adminService.listWebhookEvents(query) };
  }

  @Get("audit-logs")
  async auditLogs(@Query() query: ListQueryDto) {
    return { data: await this.adminService.listAuditLogs(query) };
  }

  @Post("organizations/:id/provisioning/retry")
  async retryProvisioning(
    @CurrentUser() admin: AccessTokenPayload,
    @Param("id") id: string,
    @Query("product") productSlug: string,
  ) {
    return { data: await this.adminService.retryProvisioning(admin.sub, id, productSlug) };
  }

  @Post("organizations/:id/entitlements")
  async grantEntitlement(
    @CurrentUser() admin: AccessTokenPayload,
    @Param("id") id: string,
    @Body() dto: GrantEntitlementDto,
  ) {
    return { data: await this.adminService.grantManualEntitlement(admin.sub, id, dto) };
  }
}
