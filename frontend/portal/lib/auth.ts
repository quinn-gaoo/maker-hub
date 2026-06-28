import { apiPath } from "@/lib/client-api";
import { getPortalSessionToken } from "@/lib/server-session";
import type { AuthSessionResponse } from "@/types";

export async function auth() {
  const token = await getPortalSessionToken();
  const response = await fetch(apiPath("/auth/session"), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  return "/api/auth/logout";
}
