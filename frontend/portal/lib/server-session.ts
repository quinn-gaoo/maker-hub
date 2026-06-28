import { cookies } from "next/headers";

import { PORTAL_SESSION_COOKIE } from "@/lib/session-cookie";

export async function getPortalSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTAL_SESSION_COOKIE)?.value ?? null;
}
