export const PROVISIONING_ADAPTER = "PROVISIONING_ADAPTER";

export type ProvisioningRequestInput = {
  provisioningRequestId: string;
  clinicName: string;
  ownerName: string;
  ownerEmail: string;
  defaultLanguage: "en" | "zh";
};

export type ProvisioningAdapterResult = {
  status: "queued" | "provisioning" | "ready" | "failed";
  workspaceId?: string;
  accessUrl?: string;
  failureReason?: string;
};

// Mirrors the PROPOSED clinic-platform provisioning contract documented in
// docs/PROVISIONING_CONTRACT.md. No such endpoint exists in clinic-platform
// today -- only MockProvisioningAdapter is implemented; a future
// ClinicPlatformProvisioningAdapter would call the real (not-yet-built)
// internal API using this same interface.
export interface ProvisioningAdapter {
  requestProvisioning(input: ProvisioningRequestInput): Promise<ProvisioningAdapterResult>;
  checkStatus(provisioningRequestId: string): Promise<ProvisioningAdapterResult>;
}
