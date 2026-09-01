import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export type AccessTokenPayload = { sub: string };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing access token");
    }

    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      (request as Request & { user: AccessTokenPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
