import { NextResponse } from "next/server";

import { apiInternalRequest } from "@/lib/backend";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const parsed = JSON.parse(rawBody) as { projectId: string; content: string };

  try {
    const payload = await apiInternalRequest(`/projects/${parsed.projectId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: parsed.content }),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "评论失败。" },
      { status: 400 },
    );
  }
}
