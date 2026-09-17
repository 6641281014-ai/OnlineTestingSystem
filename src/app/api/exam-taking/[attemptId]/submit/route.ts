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
        exam: {
          include: {
            examQuestions: {
              include: {
                question: {
                  include: {
                    choices: true,
                  },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลการสอบ" }, { status: 404 });
    }

    // Anti-IDOR Check
    if (user.role !== "ADMIN" && attempt.studentId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ส่งแบบทดสอบนี้" }, { status: 403 });
    }

    // Check if already submitted
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({
        success: true,
        message: "แบบทดสอบนี้ได้รับการบันทึกการส่งไปก่อนหน้านี้แล้ว",
        alreadySubmitted: true,
        totalScore: attempt.totalScore,
        percentage: attempt.percentage,
      });
    }

    const body = await request.json().catch(() => ({}));
    const isAutoSubmit = Boolean(body.autoSubmit);

    const now = new Date();
    const startedAt = new Date(attempt.startedAt);
    const timeSpentSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

    // Map answers by questionId
    const answersMap = new Map<string, typeof attempt.answers[0]>();
    attempt.answers.forEach((ans) => {
      answersMap.set(ans.questionId, ans);
    });

    let totalScoreEarned = 0;

    // Transactionally grade and submit
    await prisma.$transaction(async (tx) => {
      for (const eq of attempt.exam.examQuestions) {
        const studentAns = answersMap.get(eq.questionId);
        const correctChoice = eq.question.choices.find((c) => c.isCorrect);

        let isCorrect = false;
        let earnedScore = 0;

        if (studentAns && studentAns.selectedChoiceId && correctChoice) {
          if (studentAns.selectedChoiceId === correctChoice.id) {
            isCorrect = true;
            earnedScore = eq.score;
            totalScoreEarned += earnedScore;
          }
        }

        // Update answer record if exists, or create if answered empty
        if (studentAns) {
          await tx.studentAnswer.update({
            where: { id: studentAns.id },
            data: {
              isCorrect,
              earnedScore,
            },
          });
        }
      }

      const examTotalScore = attempt.exam.totalScore || 1;
      const percentage = Math.min(100, (totalScoreEarned / examTotalScore) * 100);

      // Update attempt status
      await tx.examAttempt.update({
        where: { id: params.attemptId },
        data: {
          submittedAt: now,
          timeSpentSeconds,
          totalScore: totalScoreEarned,
          percentage: Number(percentage.toFixed(2)),
          status: isAutoSubmit ? "TIMED_OUT" : "SUBMITTED",
        },
      });

      // Clean up any sibling IN_PROGRESS attempts for this student and exam
      // 1. Delete orphan attempts that have no answers
      await tx.examAttempt.deleteMany({
        where: {
          examId: attempt.examId,
          studentId: attempt.studentId,
          id: { not: params.attemptId },
          status: "IN_PROGRESS",
          answers: { none: {} },
        },
      });

      // 2. If any other attempt still remains in IN_PROGRESS, mark it CANCELLED
      await tx.examAttempt.updateMany({
        where: {
          examId: attempt.examId,
          studentId: attempt.studentId,
          id: { not: params.attemptId },
          status: "IN_PROGRESS",
        },
        data: {
          status: "CANCELLED",
        },
      });

      // Log submission event
      await tx.examLog.create({
        data: {
          attemptId: params.attemptId,
          eventType: isAutoSubmit ? "TIME_EXPIRED" : "EXAM_SUBMIT",
          details: JSON.stringify({
            submittedAt: now.toISOString(),
            timeSpentSeconds,
            totalScoreEarned,
            isAutoSubmit,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "ส่งแบบทดสอบเรียบร้อยแล้ว",
      totalScore: totalScoreEarned,
      percentage: Number(((totalScoreEarned / (attempt.exam.totalScore || 1)) * 100).toFixed(2)),
      timeSpentSeconds,
      submittedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("POST Submit Exam Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการส่งแบบทดสอบ" }, { status: 500 });
  }
}
