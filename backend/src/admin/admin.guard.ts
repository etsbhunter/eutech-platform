import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { OrganizationRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AccessTokenPayload } from "../auth/access-token.guard";

// Must run after AccessTokenGuard so request.user is populated. A user is an
// Eutech internal admin if they hold an EUTECH_INTERNAL_ADMIN membership in
// any organization -- there is no separate "staff" table in this schema; see
// prisma/seed.ts for how the local admin account is created.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: AccessTokenPayload }>();

    const adminMembership = await this.prisma.organizationMembership.findFirst({
      where: { userId: request.user.sub, role: OrganizationRole.EUTECH_INTERNAL_ADMIN },
    });

    if (!adminMembership) {
      throw new ForbiddenException("Eutech Admin access required.");
    }

    return true;
  }
}
