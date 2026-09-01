import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword } from "../common/password";
import { generateOpaqueToken, hashOpaqueToken } from "../common/opaque-token";
import { parseDurationMs } from "../common/duration";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

export const REFRESH_COOKIE_NAME = "eutech_refresh_token";
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  get refreshCookieMaxAgeMs(): number {
    return parseDurationMs(process.env.JWT_REFRESH_TTL ?? "30d");
  }

  private async signAccessToken(userId: string): Promise<string> {
    const options: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ?? "15m") as JwtSignOptions["expiresIn"],
    };
    return this.jwtService.signAsync({ sub: userId }, options);
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = generateOpaqueToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt: new Date(Date.now() + this.refreshCookieMaxAgeMs),
      },
    });
    return rawToken;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, fullName: dto.fullName },
    });

    const rawToken = generateOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });
    // Notification stub: no real email is sent locally/in this environment.
    this.logger.log(`Email verification token for ${user.email}: ${rawToken} (stub, not emailed)`);

    const accessToken = await this.signAccessToken(user.id);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const accessToken = await this.signAccessToken(user.id);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    };
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) {
      throw new UnauthorizedException("Missing refresh token.");
    }

    const tokenHash = hashOpaqueToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    if (existing.revokedAt) {
      // Reuse of an already-rotated-out refresh token: treat as a possible
      // theft and revoke the whole session family for this user.
      await this.prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected; all sessions revoked.");
    }

    const newRawToken = generateOpaqueToken();
    const newToken = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashOpaqueToken(newRawToken),
        expiresAt: new Date(Date.now() + this.refreshCookieMaxAgeMs),
      },
    });
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenId: newToken.id },
    });

    const accessToken = await this.signAccessToken(existing.userId);
    return { accessToken, refreshToken: newRawToken };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = hashOpaqueToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      emailVerified: Boolean(user.emailVerified),
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const rawToken = generateOpaqueToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashOpaqueToken(rawToken),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      });
      this.logger.log(`Password reset token for ${email}: ${rawToken} (stub, not emailed)`);
    }
    // Always the same response, whether or not the account exists.
    return { message: "If an account exists for this email, a reset link has been sent." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashOpaqueToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token.");
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: "Password has been reset. Please log in again." };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = hashOpaqueToken(rawToken);
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired verification token.");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: "Email verified." };
  }
}
