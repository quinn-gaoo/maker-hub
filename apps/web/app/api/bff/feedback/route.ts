import { NextResponse } from "next/server";

import { apiRequest } from "@/lib/backend";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const parsed = JSON.parse(rawBody) as { content: string };

  try {
    const payload = await apiRequest("/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: parsed.content }),
    });
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "反馈提交失败。" },
      { status: 400 },
    );
  }
}
