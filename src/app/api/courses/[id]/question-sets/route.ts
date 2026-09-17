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

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, instructorId: true, code: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้" }, { status: 403 });
    }

    const questionSets = await prisma.questionSet.findMany({
      where: { courseId: params.id },
      include: {
        _count: {
          select: { questions: true },
        },
        questions: {
          where: { categoryId: { not: null } },
          select: { categoryId: true },
          distinct: ["categoryId"],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedSets = questionSets.map((qs) => ({
      id: qs.id,
      title: qs.title,
      description: qs.description,
      createdAt: qs.createdAt,
      updatedAt: qs.updatedAt,
      questionCount: qs._count.questions,
      categoryCount: qs.questions.length,
    }));

    return NextResponse.json({
      success: true,
      course,
      questionSets: formattedSets,
    });
  } catch (error) {
    console.error("GET Question Sets Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลชุดข้อสอบ" },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์ผู้สอนเท่านั้นที่สามารถสร้างชุดข้อสอบได้" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการรายวิชานี้" }, { status: 403 });
    }

    const body = await request.json();
    const title = body.title?.trim();
    const description = body.description?.trim() || null;

    if (!title) {
      return NextResponse.json({ success: false, message: "กรุณาระบุชื่อชุดข้อสอบ" }, { status: 400 });
    }

    const newSet = await prisma.questionSet.create({
      data: {
        courseId: params.id,
        createdById: user.id,
        title,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: "สร้างชุดข้อสอบสำเร็จ",
      questionSet: newSet,
    });
  } catch (error) {
    console.error("POST Question Set Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการสร้างชุดข้อสอบ" },
      { status: 500 }
    );
  }
}
