import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  { params }: { params: { id: string; setId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const questionSet = await prisma.questionSet.findUnique({
      where: { id: params.setId },
      include: { course: true },
    });

    if (!questionSet || questionSet.courseId !== params.id) {
      return NextResponse.json({ success: false, message: "ไม่พบชุดข้อสอบนี้" }, { status: 404 });
    }

    if (user.role === "TEACHER" && questionSet.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการแบบทดสอบในรายวิชานี้" }, { status: 403 });
    }

    const body = await request.json();
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ success: false, message: "กรุณาระบุชื่อแบบทดสอบ" }, { status: 400 });
    }

    const description = body.description?.trim() || null;
    const examType = body.examType || "QUIZ";
    const durationMinutes = parseInt(body.durationMinutes, 10) || 60;
    const scorePerQuestion = parseFloat(body.scorePerQuestion) || 1.0;
    const shuffleQuestions = body.shuffleQuestions !== false;
    const shuffleChoices = body.shuffleChoices !== false;
    const isPublished = Boolean(body.isPublished);

    // Filters
    const categoryId = body.categoryId;
    const difficulty = body.difficulty;
    const questionType = body.questionType;
    const requestedCount = parseInt(body.questionCount, 10);

    const whereCondition: any = {
      courseId: params.id,
      questionSetId: params.setId,
    };

    if (categoryId && categoryId !== "ALL") {
      if (categoryId === "UNCATEGORIZED") {
        whereCondition.categoryId = null;
      } else {
        whereCondition.categoryId = categoryId;
      }
    }

    if (difficulty && difficulty !== "ALL") {
      whereCondition.difficulty = difficulty;
    }

    if (questionType && questionType !== "ALL") {
      whereCondition.questionType = questionType;
    }

    // Fetch all candidate questions from the set matching filters
    const candidateQuestions = await prisma.question.findMany({
      where: whereCondition,
      select: { id: true },
    });

    if (candidateQuestions.length === 0) {
      return NextResponse.json(
        { success: false, message: "ไม่พบข้อสอบในชุดที่ตรงตามเงื่อนไขตัวกรองที่เลือก" },
        { status: 400 }
      );
    }

    // Pick questions (with random shuffle if requested or sample count)
    let selectedQuestions = candidateQuestions;
    if (shuffleQuestions) {
      selectedQuestions = shuffleArray(candidateQuestions);
    }

    if (!isNaN(requestedCount) && requestedCount > 0 && requestedCount < selectedQuestions.length) {
      selectedQuestions = selectedQuestions.slice(0, requestedCount);
    }

    const totalScore = selectedQuestions.length * scorePerQuestion;
    const passingScore = parseFloat(body.passingScore) || totalScore * 0.5;

    // Create Exam and ExamQuestions in transaction
    const newExam = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          courseId: params.id,
          createdById: user.id,
          title,
          description,
          examType,
          totalScore,
          passingScore,
          durationMinutes,
          shuffleQuestions,
          shuffleChoices,
          isPublished,
        },
      });

      await tx.examQuestion.createMany({
        data: selectedQuestions.map((q, idx) => ({
          examId: exam.id,
          questionId: q.id,
          score: scorePerQuestion,
          orderIndex: idx,
        })),
      });

      return exam;
    });

    return NextResponse.json({
      success: true,
      message: `สร้างแบบทดสอบสำเร็จ โดยสุ่ม/เลือกข้อสอบจำนวน ${selectedQuestions.length} ข้อ`,
      exam: newExam,
      questionCount: selectedQuestions.length,
    });
  } catch (error: any) {
    console.error("Generate Exam from Set Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "เกิดข้อผิดพลาดในการสร้างแบบทดสอบ" },
      { status: 500 }
    );
  }
}
