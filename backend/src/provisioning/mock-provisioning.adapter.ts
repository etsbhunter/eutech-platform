import { Injectable } from "@nestjs/common";
import {
  ProvisioningAdapter,
  ProvisioningAdapterResult,
  ProvisioningRequestInput,
} from "./provisioning-adapter.interface";

// Local/dev only. Simulates the asynchronous lifecycle a real clinic-platform
// provisioning API would have (queued -> provisioning -> ready) so the state
// machine and "never ready until workspaceId+accessUrl exist" gating can be
// exercised without depending on a change to clinic-platform. In-memory only
// -- fine for a mock adapter, since ProvisioningService persists the
// authoritative status in ProductInstance regardless.
@Injectable()
export class MockProvisioningAdapter implements ProvisioningAdapter {
  private readonly startedAt = new Map<string, number>();

  private get delayMs(): number {
    return Number(process.env.MOCK_PROVISIONING_DELAY_MS ?? 3000);
  }

  async requestProvisioning(input: ProvisioningRequestInput): Promise<ProvisioningAdapterResult> {
    this.startedAt.set(input.provisioningRequestId, Date.now());
    return { status: "provisioning" };
  }

  async checkStatus(provisioningRequestId: string): Promise<ProvisioningAdapterResult> {
    const startedAt = this.startedAt.get(provisioningRequestId);
    if (startedAt === undefined) {
      // Not tracked in this process's lifetime (e.g. after a restart) --
      // treat as still in progress rather than fabricating readiness.
      this.startedAt.set(provisioningRequestId, Date.now());
      return { status: "provisioning" };
    }

    if (Date.now() - startedAt < this.delayMs) {
      return { status: "provisioning" };
    }

    return {
      status: "ready",
      workspaceId: `mock-workspace-${provisioningRequestId}`,
      accessUrl: `https://clinic-platform.test/workspaces/${provisioningRequestId}`,
    };
  }
}
