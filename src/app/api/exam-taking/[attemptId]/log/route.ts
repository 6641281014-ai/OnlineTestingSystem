import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: params.attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลการสอบ" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && attempt.studentId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงการสอบนี้" }, { status: 403 });
    }

    const body = await request.json();
    const { eventType, details } = body;

    if (!eventType) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ eventType" }, { status: 400 });
    }

    const log = await prisma.examLog.create({
      data: {
        attemptId: params.attemptId,
        eventType: String(eventType).toUpperCase(),
        timestamp: new Date(),
        details: details ? (typeof details === "string" ? details : JSON.stringify(details)) : null,
      },
    });

    return NextResponse.json({
      success: true,
      logId: log.id,
    });
  } catch (error) {
    console.error("POST Exam Log Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึก Log" }, { status: 500 });
  }
}
