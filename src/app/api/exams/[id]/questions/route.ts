import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assignQuestionsSchema } from "@/lib/validations/exam";

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
        course: { select: { id: true, instructorId: true } },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบ" }, { status: 404 });
    }

    if (user.role === "TEACHER" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงแบบทดสอบนี้" }, { status: 403 });
    }

    // Get assigned questions in this exam
    const assignedExamQuestions = await prisma.examQuestion.findMany({
      where: { examId: params.id },
      include: {
        question: {
          include: {
            category: { select: { id: true, name: true } },
            choices: { orderBy: { orderIndex: "asc" } },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // Get all available questions in this course (for the Question Selector)
    const assignedQuestionIds = assignedExamQuestions.map((eq) => eq.questionId);
    const availableQuestions = await prisma.question.findMany({
      where: {
        courseId: exam.courseId,
        id: { notIn: assignedQuestionIds },
      },
      include: {
        category: { select: { id: true, name: true } },
        choices: { orderBy: { orderIndex: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      assignedQuestions: assignedExamQuestions,
      availableQuestions,
      totalQuestions: assignedExamQuestions.length,
      totalScore: assignedExamQuestions.reduce((sum, eq) => sum + eq.score, 0),
    });
  } catch (error) {
    console.error("GET Exam Questions Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลข้อสอบ" }, { status: 500 });
  }
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
      include: { course: true },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบ" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการแบบทดสอบนี้" }, { status: 403 });
    }

    const body = await request.json();
    const validation = assignQuestionsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { questionIds } = validation.data;

    // Verify all questionIds belong to the same course as the exam
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        courseId: exam.courseId,
      },
    });

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { success: false, message: "มีข้อสอบบางข้อที่ไม่ได้อยู่ในรายวิชานี้ หรือไม่พบในระบบ" },
        { status: 400 }
      );
    }

    // Get current max orderIndex
    const currentMaxOrder = await prisma.examQuestion.aggregate({
      where: { examId: params.id },
      _max: { orderIndex: true },
    });
    let nextOrder = (currentMaxOrder._max.orderIndex || 0) + 1;

    // Insert new ExamQuestions (skip existing if duplicate)
    await prisma.$transaction(async (tx) => {
      for (const q of questions) {
        const exists = await tx.examQuestion.findUnique({
          where: {
            examId_questionId: { examId: params.id, questionId: q.id },
          },
        });
        if (!exists) {
          await tx.examQuestion.create({
            data: {
              examId: params.id,
              questionId: q.id,
              score: q.defaultScore,
              orderIndex: nextOrder++,
            },
          });
        }
      }

      // Recalculate Exam total score
      const allEq = await tx.examQuestion.findMany({
        where: { examId: params.id },
      });
      const newTotalScore = allEq.reduce((sum, eq) => sum + eq.score, 0);

      await tx.exam.update({
        where: { id: params.id },
        data: { totalScore: newTotalScore },
      });
    });

    return NextResponse.json({
      success: true,
      message: `เพิ่มข้อสอบ ${questions.length} ข้อ เข้าสู่ชุดแบบทดสอบเรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error("POST Assign Questions Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการเพิ่มข้อสอบเข้าชุดสอบ" }, { status: 500 });
  }
}

export async function DELETE(
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
      include: { course: true },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบ" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการแบบทดสอบนี้" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ questionId" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.examQuestion.deleteMany({
        where: { examId: params.id, questionId },
      });

      // Recalculate Exam total score
      const allEq = await tx.examQuestion.findMany({
        where: { examId: params.id },
      });
      const newTotalScore = allEq.reduce((sum, eq) => sum + eq.score, 0);

      await tx.exam.update({
        where: { id: params.id },
        data: { totalScore: newTotalScore },
      });
    });

    return NextResponse.json({
      success: true,
      message: "นำข้อสอบออกจากชุดแบบทดสอบแล้ว",
    });
  } catch (error) {
    console.error("DELETE Exam Question Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการนำข้อสอบออก" }, { status: 500 });
  }
}
