import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือผู้ดูแลระบบเท่านั้น" }, { status: 403 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { id: true, code: true, title: true, instructorId: true } },
        _count: { select: { examQuestions: true } },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบ" }, { status: 404 });
    }

    // Anti-IDOR for Teacher
    if (user.role === "TEACHER" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ดูผลการสอบของวิชานี้" }, { status: 403 });
    }

    // Fetch all student attempts for this exam
    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId: params.id,
        status: { in: ["SUBMITTED", "TIMED_OUT", "IN_PROGRESS"] },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentOrTeacherId: true,
          },
        },
        _count: {
          select: {
            answers: true,
            logs: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const studentResults = attempts.map((att) => ({
      attemptId: att.id,
      studentId: att.student.id,
      studentCode: att.student.studentOrTeacherId || "-",
      studentName: att.student.name,
      studentEmail: att.student.email,
      attemptNumber: att.attemptNumber,
      totalScore: att.totalScore,
      maxScore: exam.totalScore,
      percentage: att.percentage,
      isPassed: att.totalScore >= exam.passingScore,
      status: att.status,
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
      timeSpentSeconds: att.timeSpentSeconds,
      answeredCount: att._count.answers,
      logEventsCount: att._count.logs,
    }));

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        examType: exam.examType,
        totalScore: exam.totalScore,
        passingScore: exam.passingScore,
        course: exam.course,
      },
      results: studentResults,
    });
  } catch (error) {
    console.error("GET Teacher Exam Results Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลผลการสอบ" },
      { status: 500 }
    );
  }
}
