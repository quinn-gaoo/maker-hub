import { createHmac } from "node:crypto";

import { cookies } from "next/headers";

import { auth } from "@/lib/auth";

function getApiBaseUrl() {
  const value = process.env.API_BASE_URL;
  if (!value) {
    throw new Error("Missing API_BASE_URL.");
  }
  return value.replace(/\/$/, "");
}

function getInternalSigningSecret() {
  const value = process.env.INTERNAL_API_SIGNING_SECRET;
  if (!value) {
    throw new Error("Missing INTERNAL_API_SIGNING_SECRET.");
  }
  return value;
}

async function buildHeaders(initHeaders?: HeadersInit) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return {
    Accept: "application/json",
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(initHeaders ?? {}),
  };
}

function toBodyString(body?: BodyInit | null) {
  if (typeof body === "string") {
    return body;
  }
  return "";
}

async function buildInternalAuthHeaders(body?: BodyInit | null) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("请先登录。");
  }

  const timestamp = Date.now().toString();
  const payload = `${session.user.id}:${session.user.email ?? ""}:${timestamp}:${toBodyString(body)}`;
  const signature = createHmac("sha256", getInternalSigningSecret()).update(payload).digest("hex");

  return {
    "x-user-id": session.user.id,
    "x-user-email": session.user.email ?? "",
    "x-timestamp": timestamp,
    "x-signature": signature,
  };
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
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
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
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
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await buildHeaders(init.headers)),
      ...(await buildInternalAuthHeaders(init.body)),
    },
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
