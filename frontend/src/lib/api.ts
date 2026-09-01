export type PreferredContactMethod = "EMAIL" | "PHONE";

export type DemoRequestPayload = {
  fullName: string;
  businessEmail: string;
  phone: string;
  companyName: string;
  productSlug?: string;
  branchCount?: number;
  preferredContactMethod: PreferredContactMethod;
  message?: string;
  consent: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  website?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function submitDemoRequest(payload: DemoRequestPayload) {
  const response = await fetch(`${API_BASE_URL}/demo-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError("Failed to submit demo request", response.status);
  }

  return (await response.json()) as { data: { id: string } };
}
