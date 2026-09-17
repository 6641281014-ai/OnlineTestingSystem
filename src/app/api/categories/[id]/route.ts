import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/course";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const category = await prisma.questionCategory.findUnique({
      where: { id: params.id },
      include: { course: true },
    });

    if (!category) {
      return NextResponse.json({ success: false, message: "ไม่พบหมวดหมู่นี้" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && category.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขหมวดหมู่นี้" }, { status: 403 });
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

    const updated = await prisma.questionCategory.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขหมวดหมู่สำเร็จ",
      category: updated,
    });
  } catch (error) {
    console.error("PUT Category Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่" }, { status: 500 });
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

    const category = await prisma.questionCategory.findUnique({
      where: { id: params.id },
      include: { course: true },
    });

    if (!category) {
      return NextResponse.json({ success: false, message: "ไม่พบหมวดหมู่นี้" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && category.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ลบหมวดหมู่นี้" }, { status: 403 });
    }

    // Unlink questions from this category
    await prisma.question.updateMany({
      where: { categoryId: params.id },
      data: { categoryId: null },
    });

    // Delete category
    await prisma.questionCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "ลบหมวดหมู่เรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Category Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการลบหมวดหมู่" }, { status: 500 });
  }
}
