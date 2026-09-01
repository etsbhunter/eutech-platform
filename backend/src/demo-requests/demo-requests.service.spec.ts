import { BadRequestException } from "@nestjs/common";
import { PreferredContactMethod } from "@prisma/client";
import { DemoRequestsService } from "./demo-requests.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDemoRequestDto } from "./dto/create-demo-request.dto";

describe("DemoRequestsService", () => {
  let service: DemoRequestsService;
  let prisma: { demoRequest: { create: jest.Mock } };

  const baseDto: CreateDemoRequestDto = {
    fullName: "Jane Tan",
    businessEmail: "jane@example-clinic.com",
    phone: "+6591234567",
    companyName: "Example Clinic",
    preferredContactMethod: PreferredContactMethod.EMAIL,
    consent: true,
  };

  beforeEach(() => {
    prisma = { demoRequest: { create: jest.fn() } };
    service = new DemoRequestsService(prisma as unknown as PrismaService);
  });

  it("persists a valid demo request and returns its id", async () => {
    prisma.demoRequest.create.mockResolvedValueOnce({ id: "abc-123" });

    const result = await service.create(baseDto);

    expect(prisma.demoRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessEmail: baseDto.businessEmail,
          consentAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({ id: "abc-123" });
  });

  it("rejects a submission without consent", async () => {
    await expect(service.create({ ...baseDto, consent: false })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.demoRequest.create).not.toHaveBeenCalled();
  });

  it("silently drops a honeypot submission without persisting it", async () => {
    const result = await service.create({ ...baseDto, website: "http://spam.example" });

    expect(prisma.demoRequest.create).not.toHaveBeenCalled();
    expect(result.id).toBe("00000000-0000-0000-0000-000000000000");
  });
});
