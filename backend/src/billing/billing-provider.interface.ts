import { SubscriptionStatus } from "@prisma/client";

export const BILLING_PROVIDER = "BILLING_PROVIDER";

export type CheckoutInput = {
  organizationId: string;
  productSlug: string;
  planSlug: string;
  interval: "MONTHLY" | "ANNUAL";
  customerEmail: string;
  successUrl: string;
};

export type NormalizedWebhookEvent = {
  providerEventId: string;
  eventType: string;
  organizationId?: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  providerStatus: string;
  // Real providers identify the purchased price by their own price/variant ID
  // (resolved against Price.providerPriceId). The fake provider has no real
  // price catalogue on the provider side, so it passes planSlug/interval
  // directly instead -- the webhook processor accepts either.
  providerPriceId?: string;
  productSlug?: string;
  planSlug?: string;
  interval?: "MONTHLY" | "ANNUAL";
  currentPeriodEnd?: Date;
};

export interface BillingProvider {
  createCheckoutSession(input: CheckoutInput): Promise<{ url: string }>;
  createPortalSession(providerCustomerId: string): Promise<{ url: string }>;
  verifyAndParseWebhook(rawBody: Buffer, signatureHeader: string | undefined): NormalizedWebhookEvent;
  mapProviderStatus(providerStatus: string): SubscriptionStatus;
}
