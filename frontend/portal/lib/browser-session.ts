import { PORTAL_SESSION_COOKIE } from "@/lib/session-cookie";

export function getBrowserSessionToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${PORTAL_SESSION_COOKIE}=`;
  const target = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  if (!target) {
    return null;
  }

  return decodeURIComponent(target.slice(prefix.length));
}
