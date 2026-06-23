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

  const nextResponse = NextResponse.json({ ok: true }, { status: response.ok ? 200 : response.status });
  nextResponse.cookies.set("makerhub_session", "", { expires: new Date(0), path: "/" });
  return nextResponse;
}
