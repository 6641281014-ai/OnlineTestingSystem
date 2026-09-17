import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/course";

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

    const categories = await prisma.questionCategory.findMany({
      where: { courseId: params.id },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("GET Categories Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่" }, { status: 500 });
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

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Anti-IDOR Check: Only Teacher Owner or Admin
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์สร้างหมวดหมู่ในรายวิชานี้" }, { status: 403 });
    }

    const body = await request.json();
    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    const category = await prisma.questionCategory.create({
      data: {
        courseId: params.id,
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "สร้างหมวดหมู่ข้อสอบสำเร็จ",
      category,
    }, { status: 201 });
  } catch (error) {
    console.error("POST Category Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการสร้างหมวดหมู่" }, { status: 500 });
  }
}
