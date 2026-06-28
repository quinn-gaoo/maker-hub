import { NextResponse } from "next/server";

import { apiPath } from "@/lib/client-api";
import { PORTAL_SESSION_COOKIE } from "@/lib/session-cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const backendResponse = await fetch(apiPath("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: rawBody,
    cache: "no-store",
  });

  const text = await backendResponse.text();
  const payload = text ? JSON.parse(text) : null;
  const response = NextResponse.json(payload, { status: backendResponse.status });

  if (backendResponse.ok && payload?.token) {
    response.cookies.set({
      name: PORTAL_SESSION_COOKIE,
      value: payload.token,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}
