import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { WebhookProcessorService } from "./webhook-processor.service";
import { FakeBillingProvider } from "./fake-billing.provider";
import { LemonSqueezyBillingProvider } from "./lemonsqueezy-billing.provider";
import { BILLING_PROVIDER } from "./billing-provider.interface";
import { AccessTokenGuard } from "../auth/access-token.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [BillingController],
  providers: [
    BillingService,
    WebhookProcessorService,
    AccessTokenGuard,
    FakeBillingProvider,
    LemonSqueezyBillingProvider,
    {
      provide: BILLING_PROVIDER,
      useFactory: (fake: FakeBillingProvider, lemonSqueezy: LemonSqueezyBillingProvider) =>
        process.env.BILLING_PROVIDER === "lemonsqueezy" ? lemonSqueezy : fake,
      inject: [FakeBillingProvider, LemonSqueezyBillingProvider],
    },
  ],
})
export class BillingModule {}
