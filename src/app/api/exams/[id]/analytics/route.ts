import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { calculateDescriptiveStats, calculateItemAnalysis } from "@/lib/analytics";

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
        examQuestions: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                difficulty: true,
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบ" }, { status: 404 });
    }

    // Anti-IDOR check
    if (user.role === "TEACHER" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ดูผลวิเคราะห์ของวิชานี้" }, { status: 403 });
    }

    // Fetch submitted attempts with answers
    const submittedAttempts = await prisma.examAttempt.findMany({
      where: {
        examId: params.id,
        status: { in: ["SUBMITTED", "TIMED_OUT"] },
      },
      include: {
        answers: {
          select: {
            questionId: true,
            isCorrect: true,
            earnedScore: true,
          },
        },
      },
    });

    const scores = submittedAttempts.map((a) => a.totalScore);
    const stats = calculateDescriptiveStats(scores, exam.passingScore);

    const questionsFormatted = exam.examQuestions.map((eq) => ({
      id: eq.question.id,
      questionText: eq.question.questionText,
      questionType: eq.question.questionType,
      difficulty: eq.question.difficulty,
      score: eq.score,
    }));

    const itemAnalysis = calculateItemAnalysis(questionsFormatted, submittedAttempts);

    // Score frequency distribution for histogram (5 intervals)
    const distribution = [
      { range: "0 - 20%", count: 0 },
      { range: "21 - 40%", count: 0 },
      { range: "41 - 60%", count: 0 },
      { range: "61 - 80%", count: 0 },
      { range: "81 - 100%", count: 0 },
    ];

    for (const att of submittedAttempts) {
      const p = att.percentage;
      if (p <= 20) distribution[0].count++;
      else if (p <= 40) distribution[1].count++;
      else if (p <= 60) distribution[2].count++;
      else if (p <= 80) distribution[3].count++;
      else distribution[4].count++;
    }

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
      stats,
      distribution,
      itemAnalysis,
    });
  } catch (error) {
    console.error("GET Exam Analytics Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการวิเคราะห์ผลสอบ" },
      { status: 500 }
    );
  }
}
