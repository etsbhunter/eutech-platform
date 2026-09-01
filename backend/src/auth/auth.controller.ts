import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService, REFRESH_COOKIE_NAME } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AccessTokenGuard } from "./access-token.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AccessTokenPayload } from "./access-token.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: this.authService.refreshCookieMaxAgeMs,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { data: { accessToken, user } };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { data: { accessToken, user } };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { accessToken, refreshToken } = await this.authService.refresh(rawToken);
    this.setRefreshCookie(res, refreshToken);
    return { data: { accessToken } };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(rawToken);
    this.clearRefreshCookie(res);
    return { data: { success: true } };
  }

  @Get("me")
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() user: AccessTokenPayload) {
    return { data: await this.authService.me(user.sub) };
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return { data: await this.authService.forgotPassword(dto.email) };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return { data: await this.authService.resetPassword(dto) };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return { data: await this.authService.verifyEmail(dto.token) };
  }
}
