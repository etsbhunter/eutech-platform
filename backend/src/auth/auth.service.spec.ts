import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword } from "../common/password";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    emailVerificationToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    passwordResetToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "30d";
  });

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      emailVerificationToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService(),
    );
  });

  describe("register", () => {
    it("creates a user with a hashed password and issues tokens", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: "user-1",
        email: "jane@example.com",
        fullName: "Jane Tan",
      });
      prisma.emailVerificationToken.create.mockResolvedValueOnce({});
      prisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.register({
        email: "jane@example.com",
        password: "Str0ng!Pass",
        fullName: "Jane Tan",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "jane@example.com" }),
        }),
      );
      const passedHash = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(passedHash).not.toBe("Str0ng!Pass");
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user.email).toBe("jane@example.com");
    });

    it("rejects registration for an email that already exists", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: "existing" });

      await expect(
        service.register({ email: "jane@example.com", password: "Str0ng!Pass", fullName: "Jane" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("issues tokens for correct credentials", async () => {
      const passwordHash = await hashPassword("Str0ng!Pass");
      prisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "jane@example.com",
        fullName: "Jane Tan",
        passwordHash,
      });
      prisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.login({ email: "jane@example.com", password: "Str0ng!Pass" });

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.user.id).toBe("user-1");
    });

    it("rejects an incorrect password", async () => {
      const passwordHash = await hashPassword("Str0ng!Pass");
      prisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "jane@example.com",
        passwordHash,
      });

      await expect(
        service.login({ email: "jane@example.com", password: "wrong" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects a nonexistent account without revealing that distinction", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: "nobody@example.com", password: "whatever" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("rotates a valid refresh token", async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: "rt-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
      });
      prisma.refreshToken.create.mockResolvedValueOnce({ id: "rt-2" });
      prisma.refreshToken.update.mockResolvedValueOnce({});

      const result = await service.refresh("some-raw-token");

      expect(result.accessToken).toEqual(expect.any(String));
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rt-1" },
          data: expect.objectContaining({ replacedByTokenId: "rt-2" }),
        }),
      );
    });

    it("rejects a missing token", async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects an unknown or expired token", async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.refresh("bogus")).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("revokes the whole session family on reuse of an already-rotated token", async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: "rt-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: new Date(),
      });
      prisma.refreshToken.updateMany.mockResolvedValueOnce({});

      await expect(service.refresh("stolen-token")).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1", revokedAt: null } }),
      );
    });
  });

  describe("logout", () => {
    it("revokes the matching refresh token", async () => {
      prisma.refreshToken.updateMany.mockResolvedValueOnce({});
      await service.logout("some-raw-token");
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe("resetPassword", () => {
    it("rejects an invalid or expired token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.resetPassword({ token: "bogus", newPassword: "Str0ng!Pass" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("resets the password and revokes existing sessions for a valid token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: "prt-1",
        userId: "user-1",
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      await service.resetPassword({ token: "valid-token", newPassword: "Str0ng!Pass" });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
