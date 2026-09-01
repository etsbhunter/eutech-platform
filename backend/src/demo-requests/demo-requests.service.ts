import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDemoRequestDto } from "./dto/create-demo-request.dto";

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDemoRequestDto) {
    // Silently accept-and-drop honeypot submissions rather than telling the
    // caller anything went wrong.
    if (dto.website) {
      this.logger.warn("Dropped demo request submission with filled honeypot field");
      return { id: "00000000-0000-0000-0000-000000000000" };
    }

    if (!dto.consent) {
      throw new BadRequestException("Consent is required to submit a demo request.");
    }

    const demoRequest = await this.prisma.demoRequest.create({
      data: {
        fullName: dto.fullName,
        businessEmail: dto.businessEmail,
        phone: dto.phone,
        companyName: dto.companyName,
        productSlug: dto.productSlug,
        branchCount: dto.branchCount,
        preferredContactMethod: dto.preferredContactMethod,
        message: dto.message,
        consentAt: new Date(),
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
      },
    });

    // Admin notification stub: in production this would enqueue a job to
    // notify Eutech staff. No real email/notification is sent locally.
    this.logger.log(`Demo request received: ${demoRequest.id} (notification stub only)`);

    return { id: demoRequest.id };
  }
}
