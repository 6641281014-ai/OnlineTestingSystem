import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { questionInputSchema } from "@/lib/validations/question";

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

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { id: true, code: true, title: true, instructorId: true } },
        category: { select: { id: true, name: true } },
        choices: { orderBy: { orderIndex: "asc" } },
        _count: { select: { examQuestions: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อสอบนี้" }, { status: 404 });
    }

    // Permission check
    if (user.role === "TEACHER" && question.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้" }, { status: 403 });
    }

    // SECURITY: If student, strip `isCorrect`
    if (user.role === "STUDENT") {
      return NextResponse.json({
        success: true,
        question: {
          ...question,
          explanation: null,
          choices: question.choices.map((c) => ({
            id: c.id,
            choiceText: c.choiceText,
            imageUrl: c.imageUrl,
            orderIndex: c.orderIndex,
          })),
        },
      });
    }

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error("GET Question Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลข้อสอบ" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: { course: true },
    });

    if (!question) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อสอบนี้" }, { status: 404 });
    }

    // Anti-IDOR Check
    if (user.role !== "ADMIN" && question.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้" }, { status: 403 });
    }

    const body = await request.json();
    const validation = questionInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { categoryId, questionText, questionType, difficulty, defaultScore, imageUrl, explanation, choices } = validation.data;

    // Transactionally update question and choices
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete old choices
      await tx.choice.deleteMany({
        where: { questionId: params.id },
      });

      // 2. Update Question & insert new choices
      const updatedQ = await tx.question.update({
        where: { id: params.id },
        data: {
          categoryId: categoryId || null,
          questionText: questionText.trim(),
          questionType,
          difficulty,
          defaultScore,
          imageUrl: imageUrl || null,
          explanation: explanation?.trim() || null,
          choices: {
            create: choices.map((c, idx) => ({
              choiceText: c.choiceText.trim(),
              imageUrl: c.imageUrl || null,
              isCorrect: c.isCorrect,
              orderIndex: c.orderIndex || idx + 1,
            })),
          },
        },
        include: {
          category: true,
          choices: { orderBy: { orderIndex: "asc" } },
        },
      });

      return updatedQ;
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อสอบเรียบร้อยแล้ว",
      question: updated,
    });
  } catch (error) {
    console.error("PUT Question Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการแก้ไขข้อสอบ" }, { status: 500 });
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

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        examQuestions: true,
      },
    });

    if (!question) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อสอบนี้" }, { status: 404 });
    }

    // Anti-IDOR Check
    if (user.role !== "ADMIN" && question.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ลบข้อสอบนี้" }, { status: 403 });
    }

    // Check if question has student answers or is part of an exam with attempts
    const studentAnswersCount = await prisma.studentAnswer.count({
      where: { questionId: params.id },
    });

    const examAttemptsCount = await prisma.examAttempt.count({
      where: {
        exam: {
          examQuestions: {
            some: { questionId: params.id },
          },
        },
      },
    });

    if (studentAnswersCount > 0 || examAttemptsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่สามารถลบข้อสอบนี้ได้ เนื่องจากมีประวัติการเข้าสอบของนักศึกษาแล้ว เพื่อรักษาความถูกต้องของประวัติการประเมินผลและข้อมูลงานวิจัย",
        },
        { status: 400 }
      );
    }

    // Safe to delete: remove from any unused exams, choices, and question
    const affectedExamIds = question.examQuestions.map((eq) => eq.examId);

    await prisma.$transaction(async (tx) => {
      // 1. Delete ExamQuestion links
      if (affectedExamIds.length > 0) {
        await tx.examQuestion.deleteMany({
          where: { questionId: params.id },
        });

        // 2. Recalculate totalScore for affected exams
        for (const examId of affectedExamIds) {
          const remaining = await tx.examQuestion.findMany({
            where: { examId },
            select: { score: true },
          });
          const newTotalScore = remaining.reduce((sum, item) => sum + item.score, 0);
          await tx.exam.update({
            where: { id: examId },
            data: { totalScore: newTotalScore },
          });
        }
      }

      // 3. Delete choices
      await tx.choice.deleteMany({
        where: { questionId: params.id },
      });

      // 4. Delete the question
      await tx.question.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "ลบข้อสอบออกจากคลังเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Question Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการลบข้อสอบ" }, { status: 500 });
  }
}
