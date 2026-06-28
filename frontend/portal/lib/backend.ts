import { apiPath } from "@/lib/client-api";
import { getPortalSessionToken } from "@/lib/server-session";

async function buildHeaders(initHeaders?: HeadersInit) {
  const token = await getPortalSessionToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(initHeaders ?? {}),
  };
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), {
    ...init,
    headers: await buildHeaders(init?.headers),
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiPath(path), {
    ...init,
    headers: await buildHeaders(init.headers),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.message ?? `API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function apiInternalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}
