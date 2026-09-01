import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { AdminGuard } from "./admin.guard";
import { PrismaService } from "../prisma/prisma.service";

function contextWithUser(userId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { sub: userId } }),
    }),
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  let guard: AdminGuard;
  let prisma: { organizationMembership: { findFirst: jest.Mock } };

  beforeEach(() => {
    prisma = { organizationMembership: { findFirst: jest.fn() } };
    guard = new AdminGuard(prisma as unknown as PrismaService);
  });

  it("allows a user with an EUTECH_INTERNAL_ADMIN membership", async () => {
    prisma.organizationMembership.findFirst.mockResolvedValueOnce({
      role: OrganizationRole.EUTECH_INTERNAL_ADMIN,
    });

    await expect(guard.canActivate(contextWithUser("admin-1"))).resolves.toBe(true);
    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "admin-1", role: OrganizationRole.EUTECH_INTERNAL_ADMIN },
      }),
    );
  });

  it("rejects a regular customer user", async () => {
    prisma.organizationMembership.findFirst.mockResolvedValueOnce(null);
    await expect(guard.canActivate(contextWithUser("user-1"))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
