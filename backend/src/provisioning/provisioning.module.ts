import { Module } from "@nestjs/common";
import { ProvisioningService } from "./provisioning.service";
import { MockProvisioningAdapter } from "./mock-provisioning.adapter";
import { PROVISIONING_ADAPTER } from "./provisioning-adapter.interface";

@Module({
  providers: [
    ProvisioningService,
    MockProvisioningAdapter,
    {
      provide: PROVISIONING_ADAPTER,
      useFactory: (mock: MockProvisioningAdapter) => {
        const adapterName = process.env.PROVISIONING_ADAPTER ?? "mock";
        if (adapterName !== "mock") {
          // No real clinic-platform provisioning endpoint exists yet -- see
          // docs/PROVISIONING_CONTRACT.md. Fail clearly rather than pretend
          // to provision against something that doesn't exist.
          throw new Error(
            `Unknown or unimplemented PROVISIONING_ADAPTER "${adapterName}". Only "mock" is implemented.`,
          );
        }
        return mock;
      },
      inject: [MockProvisioningAdapter],
    },
  ],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
