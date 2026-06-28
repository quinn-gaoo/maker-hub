import { NextResponse } from "next/server";

import { apiPath } from "@/lib/client-api";
import { PORTAL_SESSION_COOKIE } from "@/lib/session-cookie";

const SUPPORTED_PROVIDERS = new Set(["google", "github"]);

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const { provider } = await context.params;

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return NextResponse.json(
      {
        message: "不支持的登录提供商。",
      },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  const backendResponse = await fetch(apiPath(`/auth/${provider}/complete`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: rawBody,
    cache: "no-store",
  });

  const text = await backendResponse.text();
  const payload = text ? safeJsonParse(text) : null;
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

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}
