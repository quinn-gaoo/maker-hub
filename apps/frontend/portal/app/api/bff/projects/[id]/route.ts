import { NextResponse } from "next/server";

import { apiInternalRequest } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.text();

  try {
    const payload = await apiInternalRequest(`/projects/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "项目更新失败。" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    await apiInternalRequest(`/projects/${id}`, {
      method: "DELETE",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "项目删除失败。" },
      { status: 400 },
    );
  }
}
