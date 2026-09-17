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

    // Optional query param ?attemptId=... for teacher/admin inspecting a specific attempt
    const { searchParams } = new URL(request.url);
    const specificAttemptId = searchParams.get("attemptId");

    let attempt;
    if (specificAttemptId) {
      attempt = await prisma.examAttempt.findUnique({
        where: { id: specificAttemptId },
        include: {
          student: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
          answers: {
            include: {
              selectedChoice: true,
              question: {
                include: {
                  choices: { orderBy: { orderIndex: "asc" } },
                },
              },
            },
          },
          logs: { orderBy: { timestamp: "asc" } },
        },
      });

      if (!attempt || attempt.examId !== params.id) {
        return NextResponse.json({ success: false, message: "ไม่พบข้อมูลประวัติการสอบ" }, { status: 404 });
      }

      // Anti-IDOR: If student, must be their own attempt
      if (user.role === "STUDENT" && attempt.studentId !== user.id) {
        return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงผลการสอบนี้" }, { status: 403 });
      }

      // If teacher, must be instructor of course
      if (user.role === "TEACHER" && exam.course.instructorId !== user.id) {
        return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงผลการสอบนี้" }, { status: 403 });
      }
    } else {
      // Fetch latest submitted attempt of current student
      attempt = await prisma.examAttempt.findFirst({
        where: {
          examId: params.id,
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        orderBy: { attemptNumber: "desc" },
        include: {
          student: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
          answers: {
            include: {
              selectedChoice: true,
              question: {
                include: {
                  choices: { orderBy: { orderIndex: "asc" } },
                },
              },
            },
          },
          logs: { orderBy: { timestamp: "asc" } },
        },
      });
    }

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "ยังไม่พบผลการสอบที่ส่งแล้วสำหรับแบบทดสอบนี้" },
        { status: 404 }
      );
    }

    const isPassed = attempt.totalScore >= exam.passingScore;
    const totalQuestions = exam._count.examQuestions;
    const correctCount = attempt.answers.filter((a) => a.isCorrect).length;
    const incorrectCount = attempt.answers.filter((a) => !a.isCorrect && a.selectedChoiceId !== null).length;
    const unansweredCount = totalQuestions - attempt.answers.length;

    // Determine review visibility
    const canReviewQuestions =
      exam.allowReview || user.role === "TEACHER" || user.role === "ADMIN";

    let reviewData = null;
    if (canReviewQuestions) {
      reviewData = attempt.answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.questionText,
        questionType: a.question.questionType,
        explanation: a.question.explanation,
        earnedScore: a.earnedScore,
        isCorrect: a.isCorrect,
        selectedChoiceId: a.selectedChoiceId,
        selectedChoiceText: a.selectedChoice?.choiceText || null,
        choices: a.question.choices.map((c) => ({
          id: c.id,
          choiceText: c.choiceText,
          isCorrect: c.isCorrect,
        })),
      }));
    }

    return NextResponse.json({
      success: true,
      result: {
        attemptId: attempt.id,
        examId: exam.id,
        examTitle: exam.title,
        examType: exam.examType,
        courseCode: exam.course.code,
        courseTitle: exam.course.title,
        studentName: attempt.student.name,
        studentId: attempt.student.studentOrTeacherId,
        totalScore: attempt.totalScore,
        maxScore: exam.totalScore,
        passingScore: exam.passingScore,
        percentage: attempt.percentage,
        isPassed,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeSpentSeconds: attempt.timeSpentSeconds,
        totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        allowReview: exam.allowReview,
        canReviewQuestions,
        reviewData,
        logs: attempt.logs,
      },
    });
  } catch (error) {
    console.error("GET Exam Result Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงผลการสอบ" },
      { status: 500 }
    );
  }
}
