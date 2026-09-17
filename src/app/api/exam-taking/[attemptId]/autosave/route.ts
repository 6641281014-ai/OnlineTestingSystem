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
      include: {
        exam: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลการสอบ" }, { status: 404 });
    }

    // Anti-IDOR: Must be the owner of the attempt
    if (user.role !== "ADMIN" && attempt.studentId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงการสอบนี้" }, { status: 403 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          success: false,
          message: "แบบทดสอบนี้ได้ถูกส่งไปแล้ว ไม่สามารถบันทึกคำตอบเพิ่มเติมได้",
          alreadySubmitted: true,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Check server deadline
    const startedTimeMs = new Date(attempt.startedAt).getTime();
    const durationMs = attempt.exam.durationMinutes * 60 * 1000;
    const deadlineMs = startedTimeMs + durationMs;

    // Allow 30 seconds grace period for network latency
    if (now.getTime() > deadlineMs + 30000) {
      return NextResponse.json(
        { success: false, message: "หมดเวลาทำแบบทดสอบแล้ว", isExpired: true },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { questionId, selectedChoiceId, answerText } = body;

    if (!questionId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ questionId" }, { status: 400 });
    }

    // Upsert StudentAnswer
    const answer = await prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: params.attemptId,
          questionId,
        },
      },
      create: {
        attemptId: params.attemptId,
        questionId,
        selectedChoiceId: selectedChoiceId || null,
        answerText: answerText?.trim() || null,
        answeredAt: now,
      },
      update: {
        selectedChoiceId: selectedChoiceId || null,
        answerText: answerText?.trim() || null,
        answeredAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: "บันทึกคำตอบสำเร็จ",
      savedAt: now.toISOString(),
      answerId: answer.id,
    });
  } catch (error) {
    console.error("POST Autosave Answer Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกคำตอบ" }, { status: 500 });
  }
}
