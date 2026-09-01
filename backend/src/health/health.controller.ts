import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res() res: Response) {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).json({
        status: "ok",
        database: "up",
        checkedInMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: "error",
        database: "down",
        checkedInMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
