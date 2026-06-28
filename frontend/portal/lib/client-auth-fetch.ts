import { getBrowserSessionToken } from "@/lib/browser-session";
import { clientApiPath } from "@/lib/client-api";

export async function clientAuthFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const token = getBrowserSessionToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(clientApiPath(path), {
    ...init,
    headers,
  });
}
