import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/server-config";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const baseUrl = getApiBaseUrl();
  const frontendBaseUrl = (process.env.AUTH_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const callback = callbackUrl.startsWith("http") ? callbackUrl : `${frontendBaseUrl}${callbackUrl.startsWith("/") ? callbackUrl : `/${callbackUrl}`}`;
  const response = await fetch(
    `${baseUrl}/auth/${provider}/start?callback_url=${encodeURIComponent(callback)}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}
