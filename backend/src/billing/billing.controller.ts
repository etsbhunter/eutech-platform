import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/access-token.guard";
import { BillingService } from "./billing.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { CreatePortalDto } from "./dto/create-portal.dto";
import { FakeCompleteCheckoutDto } from "./dto/fake-complete-checkout.dto";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout")
  @UseGuards(AccessTokenGuard)
  async checkout(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateCheckoutDto) {
    return { data: await this.billingService.createCheckout(user.sub, dto) };
  }

  @Post("portal")
  @UseGuards(AccessTokenGuard)
  async portal(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreatePortalDto) {
    return { data: await this.billingService.createPortal(user.sub, dto) };
  }

  @Post("webhooks/lemonsqueezy")
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request, @Headers("x-signature") signature?: string) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException("Missing raw request body.");
    }
    const result = await this.billingService.handleWebhook(rawBody, signature);
    return { data: { received: true, duplicate: result.duplicate } };
  }

  @Post("fake/complete-checkout")
  @HttpCode(HttpStatus.OK)
  async completeFakeCheckout(@Body() dto: FakeCompleteCheckoutDto) {
    const result = await this.billingService.completeFakeCheckout(dto);
    return { data: { completed: true, duplicate: result.duplicate } };
  }
}
