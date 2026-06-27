import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/server-config";

export async function POST() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    redirect: "manual",
  });

  const succeeded = response.ok || (response.status >= 300 && response.status < 400);
  const nextResponse = NextResponse.json({ ok: succeeded }, { status: succeeded ? 200 : response.status });
  if (succeeded) {
    nextResponse.cookies.set("makerhub_session", "", { expires: new Date(0), path: "/" });
  }
  return nextResponse;
}
