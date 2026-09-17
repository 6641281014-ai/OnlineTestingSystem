import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
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
      include: {
        course: {
          select: { id: true, instructorId: true, code: true, title: true },
        },
      },
    });

    if (!questionSet || questionSet.courseId !== params.id) {
      return NextResponse.json({ success: false, message: "ไม่พบชุดข้อสอบนี้" }, { status: 404 });
    }

    if (user.role === "TEACHER" && questionSet.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงชุดข้อสอบนี้" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const categoryId = searchParams.get("categoryId");
    const difficulty = searchParams.get("difficulty");
    const questionType = searchParams.get("type");

    const whereCondition: any = {
      courseId: params.id,
      questionSetId: params.setId,
    };

    if (search) {
      whereCondition.questionText = { contains: search };
    }

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

    const [questions, categories, totalCount] = await Promise.all([
      prisma.question.findMany({
        where: whereCondition,
        include: {
          category: { select: { id: true, name: true } },
          choices: { orderBy: { orderIndex: "asc" } },
          _count: { select: { examQuestions: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.questionCategory.findMany({
        where: { courseId: params.id },
        orderBy: { name: "asc" },
      }),
      prisma.question.count({
        where: { courseId: params.id, questionSetId: params.setId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      questionSet: {
        id: questionSet.id,
        title: questionSet.title,
        description: questionSet.description,
        createdAt: questionSet.createdAt,
        updatedAt: questionSet.updatedAt,
      },
      course: questionSet.course,
      questions,
      categories,
      totalCount,
    });
  } catch (error) {
    console.error("GET Question Set Detail Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลข้อสอบในชุด" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขชุดข้อสอบนี้" }, { status: 403 });
    }

    const body = await request.json();
    const title = body.title?.trim();
    const description = body.description?.trim() || null;

    if (!title) {
      return NextResponse.json({ success: false, message: "กรุณาระบุชื่อชุดข้อสอบ" }, { status: 400 });
    }

    const updated = await prisma.questionSet.update({
      where: { id: params.setId },
      data: {
        title,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขชุดข้อสอบสำเร็จ",
      questionSet: updated,
    });
  } catch (error) {
    console.error("PUT Question Set Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขชุดข้อสอบ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ลบชุดข้อสอบนี้" }, { status: 403 });
    }

    // When deleting question set, questions will have questionSetId set to null (due to SetNull in Prisma)
    await prisma.questionSet.delete({
      where: { id: params.setId },
    });

    return NextResponse.json({
      success: true,
      message: "ลบชุดข้อสอบเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Question Set Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการลบชุดข้อสอบ" },
      { status: 500 }
    );
  }
}
