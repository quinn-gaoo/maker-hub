import { NextResponse } from "next/server";

import { apiInternalRequest } from "@/lib/backend";

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const payload = await apiInternalRequest("/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "项目创建失败。" },
      { status: 400 },
    );
  }
}
