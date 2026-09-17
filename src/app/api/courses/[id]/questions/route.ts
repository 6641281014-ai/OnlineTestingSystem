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

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Permission check
    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงคลังข้อสอบของรายวิชานี้" }, { status: 403 });
    }

    if (user.role === "STUDENT") {
      const isEnrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: params.id, studentId: user.id } },
      });
      if (!isEnrolled) {
        return NextResponse.json({ success: false, message: "คุณไม่ได้ลงทะเบียนในรายวิชานี้" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const difficulty = searchParams.get("difficulty") || "";
    const questionType = searchParams.get("type") || "";
    const questionSetId = searchParams.get("questionSetId") || "";

    // Build filter
    const whereCondition: Record<string, unknown> = {
      courseId: params.id,
    };

    if (search.trim()) {
      whereCondition.questionText = {
        contains: search.trim(),
      };
    }

    if (categoryId && categoryId !== "ALL") {
      whereCondition.categoryId = categoryId;
    }

    if (difficulty && difficulty !== "ALL") {
      whereCondition.difficulty = difficulty;
    }

    if (questionType && questionType !== "ALL") {
      whereCondition.questionType = questionType;
    }

    if (questionSetId && questionSetId !== "ALL") {
      whereCondition.questionSetId = questionSetId;
    }

    const questions = await prisma.question.findMany({
      where: whereCondition,
      include: {
        category: { select: { id: true, name: true } },
        choices: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { examQuestions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // SECURITY: If student, strip `isCorrect` from choices!
    const sanitizedQuestions = questions.map((q) => {
      if (user.role === "STUDENT") {
        return {
          ...q,
          explanation: null,
          choices: q.choices.map((c) => ({
            id: c.id,
            choiceText: c.choiceText,
            imageUrl: c.imageUrl,
            orderIndex: c.orderIndex,
          })),
        };
      }
      return q;
    });

    return NextResponse.json({
      success: true,
      count: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error("GET Questions Error:", error);
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

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์สร้างข้อสอบ" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Anti-IDOR: Check teacher ownership
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์สร้างข้อสอบในรายวิชาของอาจารย์ท่านอื่น" }, { status: 403 });
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

    // Verify categoryId belongs to course if provided
    if (categoryId) {
      const cat = await prisma.questionCategory.findFirst({
        where: { id: categoryId, courseId: params.id },
      });
      if (!cat) {
        return NextResponse.json({ success: false, message: "ไม่พบหมวดหมู่ที่เลือกในรายวิชานี้" }, { status: 400 });
      }
    }

    // Transactionally create Question and Choices
    const newQuestion = await prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          courseId: params.id,
          questionSetId: body.questionSetId || null,
          categoryId: categoryId || null,
          createdById: user.id,
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
      return q;
    });

    return NextResponse.json({
      success: true,
      message: "สร้างข้อสอบใหม่สำเร็จ",
      question: newQuestion,
    }, { status: 201 });
  } catch (error) {
    console.error("POST Question Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการสร้างข้อสอบ" }, { status: 500 });
  }
}
