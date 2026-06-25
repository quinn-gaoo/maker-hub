import { NextResponse } from "next/server";

import { apiRequest } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.arrayBuffer();
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const fileName = request.headers.get("x-file-name") ?? "";

  try {
    const payload = await apiRequest(`/uploads/projects/${id}/images`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "X-File-Name": fileName,
      },
      body,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { code: "API_ERROR", message: error instanceof Error ? error.message : "图片上传失败。" },
      { status: 400 },
    );
  }
}
