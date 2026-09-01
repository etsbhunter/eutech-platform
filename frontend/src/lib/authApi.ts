const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  emailVerified?: boolean;
  organizations?: { id: string; name: string; role: string }[];
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function registerRequest(input: { fullName: string; email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new AuthApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as { data: { accessToken: string; user: AuthUser } };
}

export async function loginRequest(input: { email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new AuthApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as { data: { accessToken: string; user: AuthUser } };
}

export async function refreshRequest() {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new AuthApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as { data: { accessToken: string } };
}

export async function logoutRequest() {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function meRequest(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new AuthApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as { data: AuthUser };
}

export async function forgotPasswordRequest(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new AuthApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as { data: { message: string } };
}

export async function resetPasswordRequest(input: { token: string; newPassword: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new AuthApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as { data: { message: string } };
}
