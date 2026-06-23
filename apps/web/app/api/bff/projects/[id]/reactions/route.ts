import { NextResponse } from "next/server";

import { apiRequest } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.text();

  try {
    const payload = await apiRequest(`/projects/${id}/reactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "操作失败。" },
      { status: 400 },
    );
  }
}
