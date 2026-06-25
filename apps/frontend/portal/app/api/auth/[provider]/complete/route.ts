import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/server-config";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { provider } = await params;
  const payload = await request.text();
  const response = await fetch(`${getApiBaseUrl()}/auth/${provider}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
  });

  const responseText = await response.text();
  let responsePayload: unknown = null;

  if (responseText) {
    try {
      responsePayload = JSON.parse(responseText);
    } catch {
      responsePayload = { message: responseText };
    }
  }

  const nextResponse = NextResponse.json(responsePayload, { status: response.status });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    nextResponse.headers.set("set-cookie", setCookie);
  }
  return nextResponse;
}
