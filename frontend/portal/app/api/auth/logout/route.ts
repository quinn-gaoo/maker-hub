import { NextResponse } from "next/server";

import { apiPath } from "@/lib/client-api";
import { PORTAL_SESSION_COOKIE } from "@/lib/session-cookie";
import { getPortalSessionToken } from "@/lib/server-session";

export const runtime = "nodejs";

export async function POST() {
  const token = await getPortalSessionToken();
  const backendResponse = await fetch(apiPath("/auth/logout"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const text = await backendResponse.text();
  const payload = text ? JSON.parse(text) : { ok: backendResponse.ok };
  const response = NextResponse.json(payload, { status: backendResponse.status });
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: "",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
