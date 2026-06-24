import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/server-config";

export async function POST(request: Request) {
  const payload = await request.text();
  const response = await fetch(`${getApiBaseUrl()}/auth/email-verification-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
  });

  return NextResponse.json(await response.json().catch(() => null), { status: response.status });
}
