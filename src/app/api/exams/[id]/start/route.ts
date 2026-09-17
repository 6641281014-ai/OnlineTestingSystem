import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Simple Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
        examQuestions: {
          include: {
            question: {
              include: {
                category: { select: { name: true } },
                choices: { orderBy: { orderIndex: "asc" } },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบนี้" }, { status: 404 });
    }

    // Check if published
    if (!exam.isPublished && user.role === "STUDENT") {
      return NextResponse.json({ success: false, message: "แบบทดสอบนี้ยังไม่เปิดให้เข้าสอบ" }, { status: 403 });
    }

    // Check enrollment
    if (user.role === "STUDENT") {
      const isEnrolled = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: { courseId: exam.courseId, studentId: user.id },
        },
      });

      if (!isEnrolled) {
        return NextResponse.json({ success: false, message: "คุณไม่ได้ลงทะเบียนในรายวิชานี้" }, { status: 403 });
      }
    }

    const now = new Date();

    // Check time window
    if (exam.startTime && now < new Date(exam.startTime) && user.role === "STUDENT") {
      return NextResponse.json(
        {
          success: false,
          message: `ยังไม่ถึงเวลาเริ่มสอบ (เริ่มสอบวันที่ ${new Date(exam.startTime).toLocaleString("th-TH")})`,
        },
        { status: 400 }
      );
    }

    if (exam.endTime && now > new Date(exam.endTime) && user.role === "STUDENT") {
      return NextResponse.json(
        {
          success: false,
          message: `แบบทดสอบนี้ปิดรับการส่งแล้ว (สิ้นสุดเวลา ${new Date(exam.endTime).toLocaleString("th-TH")})`,
        },
        { status: 400 }
      );
    }

    if (exam.examQuestions.length === 0) {
      return NextResponse.json(
        { success: false, message: "แบบทดสอบนี้ยังไม่มีข้อสอบ" },
        { status: 400 }
      );
    }

    // Check existing attempts for Student (Handle possible duplicates atomically)
    const inProgressAttempts = await prisma.examAttempt.findMany({
      where: {
        examId: params.id,
        studentId: user.id,
        status: "IN_PROGRESS",
      },
      include: {
        answers: true,
      },
      orderBy: { startedAt: "desc" },
    });

    let activeAttempt: (typeof inProgressAttempts[0]) | null =
      inProgressAttempts.find((a) => a.answers.length > 0) || inProgressAttempts[0] || null;

    // Clean up any extra empty IN_PROGRESS attempts
    if (inProgressAttempts.length > 1) {
      const idsToDelete = inProgressAttempts
        .filter((a) => a.id !== activeAttempt?.id && a.answers.length === 0)
        .map((a) => a.id);
      if (idsToDelete.length > 0) {
        await prisma.examAttempt.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    }

    // Check if active attempt is expired
    if (activeAttempt) {
      const startedTimeMs = new Date(activeAttempt.startedAt).getTime();
      const durationMs = exam.durationMinutes * 60 * 1000;
      let deadlineMs = startedTimeMs + durationMs;
      if (exam.endTime) {
        const examEndTimeMs = new Date(exam.endTime).getTime();
        if (examEndTimeMs < deadlineMs) {
          deadlineMs = examEndTimeMs;
        }
      }

      // If active attempt is expired (+30s grace), automatically submit/timeout it
      if (now.getTime() > deadlineMs + 30000) {
        await prisma.examAttempt.update({
          where: { id: activeAttempt.id },
          data: {
            status: "TIMED_OUT",
            submittedAt: now,
            timeSpentSeconds: Math.round((now.getTime() - startedTimeMs) / 1000),
          },
        });
        activeAttempt = null; // No longer active
      }
    }

    // If no active in-progress attempt, check completed attempts
    if (!activeAttempt) {
      const completedCount = await prisma.examAttempt.count({
        where: {
          examId: params.id,
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
      });

      if (user.role === "STUDENT" && completedCount >= exam.maxAttempts) {
        // Clean up any stray empty IN_PROGRESS attempts
        await prisma.examAttempt.deleteMany({
          where: {
            examId: params.id,
            studentId: user.id,
            status: "IN_PROGRESS",
            answers: { none: {} },
          },
        });

        return NextResponse.json(
          {
            success: false,
            message: `คุณได้ทำแบบทดสอบนี้ครบจำนวนที่กำหนดแล้ว (${completedCount}/${exam.maxAttempts} ครั้ง)`,
            alreadySubmitted: true,
            completedCount,
            maxAttempts: exam.maxAttempts,
          },
          { status: 400 }
        );
      }

      // Atomically check or create new ExamAttempt in a transaction to prevent race conditions
      const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const userAgent = request.headers.get("user-agent");

      activeAttempt = await prisma.$transaction(async (tx) => {
        const existing = await tx.examAttempt.findFirst({
          where: {
            examId: params.id,
            studentId: user.id,
            status: "IN_PROGRESS",
          },
          include: {
            answers: true,
          },
        });

        if (existing) {
          return existing;
        }

        const newAttempt = await tx.examAttempt.create({
          data: {
            examId: params.id,
            studentId: user.id,
            attemptNumber: completedCount + 1,
            startedAt: now,
            status: "IN_PROGRESS",
            clientIp,
          },
          include: {
            answers: true,
          },
        });

        await tx.examLog.create({
          data: {
            attemptId: newAttempt.id,
            eventType: "EXAM_START",
            details: JSON.stringify({
              userAgent,
              startedAt: now.toISOString(),
            }),
          },
        });

        return newAttempt;
      });
    }

    // Prepare questions (Randomize if configured & STRIP isCorrect & explanation)
    let processedQuestions = exam.examQuestions.map((eq, index) => {
      const q = eq.question;
      let choices = q.choices.map((c) => ({
        id: c.id,
        choiceText: c.choiceText,
        imageUrl: c.imageUrl,
        orderIndex: c.orderIndex,
        // STRICT SECURITY: isCorrect is NEVER returned to student!
      }));

      if (exam.shuffleChoices) {
        choices = shuffleArray(choices);
      }

      return {
        id: q.id,
        orderIndex: eq.orderIndex || index + 1,
        score: eq.score,
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty,
        imageUrl: q.imageUrl,
        categoryName: q.category?.name || null,
        choices,
      };
    });

    if (exam.shuffleQuestions) {
      processedQuestions = shuffleArray(processedQuestions);
    }

    // Map saved answers
    const savedAnswersMap: Record<string, { selectedChoiceId?: string | null; answerText?: string | null }> = {};
    activeAttempt.answers.forEach((ans) => {
      savedAnswersMap[ans.questionId] = {
        selectedChoiceId: ans.selectedChoiceId,
        answerText: ans.answerText,
      };
    });

    // Calculate deadline timestamp
    const startedTimeMs = new Date(activeAttempt.startedAt).getTime();
    const durationMs = exam.durationMinutes * 60 * 1000;
    let deadlineMs = startedTimeMs + durationMs;

    if (exam.endTime) {
      const examEndTimeMs = new Date(exam.endTime).getTime();
      if (examEndTimeMs < deadlineMs) {
        deadlineMs = examEndTimeMs;
      }
    }

    return NextResponse.json({
      success: true,
      attemptId: activeAttempt.id,
      startedAt: activeAttempt.startedAt,
      durationMinutes: exam.durationMinutes,
      deadlineAt: new Date(deadlineMs).toISOString(),
      serverTime: now.toISOString(),
      examTitle: exam.title,
      courseCode: exam.course.code,
      courseTitle: exam.course.title,
      totalScore: exam.totalScore,
      questions: processedQuestions,
      savedAnswers: savedAnswersMap,
    });
  } catch (error) {
    console.error("POST Start Exam Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการเริ่มทำแบบทดสอบ" }, { status: 500 });
  }
}
