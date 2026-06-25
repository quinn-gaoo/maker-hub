import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      code: "DEPRECATED",
      message: "图片上传已改为前端直接调用后端接口。",
    },
    { status: 410 },
  );
}
