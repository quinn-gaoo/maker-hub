import { cookies } from "next/headers";

import type { AuthSessionResponse } from "@/types";

function getApiBaseUrl() {
  const value = process.env.API_BASE_URL;
  if (!value) {
    throw new Error("Missing API_BASE_URL.");
  }
  return value.replace(/\/$/, "");
}

export async function auth() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as AuthSessionResponse;
  return payload.authenticated ? payload : null;
}

export function getLogoutUrl() {
  return `${getApiBaseUrl()}/auth/logout`;
}
