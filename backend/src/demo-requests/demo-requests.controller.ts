import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { DemoRequestsService } from "./demo-requests.service";
import { CreateDemoRequestDto } from "./dto/create-demo-request.dto";

@Controller("demo-requests")
export class DemoRequestsController {
  constructor(private readonly demoRequestsService: DemoRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateDemoRequestDto) {
    const { id } = await this.demoRequestsService.create(dto);
    return { data: { id } };
  }
}
