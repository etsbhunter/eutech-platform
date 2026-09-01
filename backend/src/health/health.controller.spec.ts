import { Test, TestingModule } from "@nestjs/testing";
import type { Response } from "express";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";

type MockResponse = { status: jest.Mock; json: jest.Mock };

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  function mockResponse(): MockResponse {
    const partial: MockResponse = { status: jest.fn(), json: jest.fn() };
    partial.status.mockReturnValue(partial);
    partial.json.mockReturnValue(partial);
    return partial;
  }

  it("returns ok when the database responds", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const res = mockResponse();

    await controller.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", database: "up" }),
    );
  });

  it("returns 503 when the database is unreachable", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const res = mockResponse();

    await controller.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", database: "down" }),
    );
  });
});
