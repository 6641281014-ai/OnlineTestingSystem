import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        _count: { select: { examQuestions: true } },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบ" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการแบบทดสอบนี้" }, { status: 403 });
    }

    const nextState = !exam.isPublished;

    // Check conditions before publishing
    if (nextState) {
      if (exam._count.examQuestions === 0) {
        return NextResponse.json(
          { success: false, message: "ไม่สามารถเปิดแบบทดสอบได้ กรุณาเพิ่มข้อสอบอย่างน้อย 1 ข้อ" },
          { status: 400 }
        );
      }
      if (!exam.durationMinutes || exam.durationMinutes <= 0) {
        return NextResponse.json(
          { success: false, message: "ไม่สามารถเปิดแบบทดสอบได้ ระยะเวลาทำข้อสอบไม่ถูกต้อง" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.exam.update({
      where: { id: params.id },
      data: { isPublished: nextState },
    });

    return NextResponse.json({
      success: true,
      message: nextState ? "เปิดให้เข้าทำแบบทดสอบแล้ว (Published)" : "ปิดการเข้าทำแบบทดสอบ (Unpublished)",
      isPublished: updated.isPublished,
    });
  } catch (error) {
    console.error("POST Toggle Publish Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการปรับสถานะแบบทดสอบ" }, { status: 500 });
  }
}
