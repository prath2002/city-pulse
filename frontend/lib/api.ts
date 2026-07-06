/**
 * Typed API client for the CityPulse backend (contract: documents/09_API_Specification.md).
 * All requests go to NEXT_PUBLIC_API_URL; errors follow the standard envelope.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

/** Standard error envelope (Doc 9 §1). */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.error.message);
    this.name = "ApiRequestError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  token?: string;
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  { token, body, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
      error: { code: "unknown", message: response.statusText },
    }))) as ApiError;
    throw new ApiRequestError(response.status, errorBody);
  }

  return (await response.json()) as T;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}

export const getHealth = () => apiFetch<HealthResponse>("/health");
