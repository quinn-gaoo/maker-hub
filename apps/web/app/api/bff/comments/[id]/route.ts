import { NextResponse } from "next/server";

import { apiInternalRequest } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    await apiInternalRequest(`/comments/${id}`, {
      method: "DELETE",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "删除评论失败。" },
      { status: 400 },
    );
  }
}
