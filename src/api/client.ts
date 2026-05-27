import { config } from "../config.js";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown = undefined
  ) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as Record<string, unknown>).message)
        : `API error ${status}: ${statusText}`;
    super(msg);
  }
}

export interface RequestOptions {
  serviceAuth?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = `${config.api.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options?.serviceAuth) {
    const token = process.env.SERVICE_API_KEY;
    if (!token) {
      throw new Error("SERVICE_API_KEY environment variable is required for this call");
    }
    headers["X-Service-Token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let responseBody: unknown;
    try {
      responseBody = await res.json();
    } catch {
      responseBody = undefined;
    }
    throw new ApiError(res.status, res.statusText, responseBody);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, options);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>("POST", path, body, options);
}
