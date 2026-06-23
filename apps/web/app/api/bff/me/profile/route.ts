import { NextResponse } from "next/server";

import { apiInternalRequest } from "@/lib/backend";

export async function PATCH(request: Request) {
  const body = await request.text();

  try {
    const payload = await apiInternalRequest("/users/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "个人信息更新失败。" },
      { status: 400 },
    );
  }
}
