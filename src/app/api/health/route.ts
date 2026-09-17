import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    system: "ระบบทดสอบออนไลน์เพื่อประเมินผลสัมฤทธิ์ทางการเรียน",
    timestamp: new Date().toISOString(),
  });
}
