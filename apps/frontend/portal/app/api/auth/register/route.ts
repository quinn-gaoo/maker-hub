import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/server-config";

export async function POST(request: Request) {
  const payload = await request.text();
  const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
  });

  const nextResponse = NextResponse.json(await response.json().catch(() => null), { status: response.status });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    nextResponse.headers.set("set-cookie", setCookie);
  }
  return nextResponse;
}
