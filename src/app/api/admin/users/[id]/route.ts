import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล").optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional(),
  studentOrTeacherId: z.string().optional().nullable(),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้น" },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentOrTeacherId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
            coursesTeaching: true,
            attempts: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Admin Get User By ID Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขข้อมูลผู้ใช้ได้" },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const { name, email, studentOrTeacherId, role, isActive } = validation.data;

    // Admin Self-Protection Rules
    if (params.id === currentUser.id) {
      if (isActive === false) {
        return NextResponse.json(
          { success: false, message: "ผู้ดูแลระบบไม่สามารถปิดการใช้งานบัญชีตนเองได้" },
          { status: 400 }
        );
      }
      if (role && role !== "ADMIN") {
        return NextResponse.json(
          { success: false, message: "ผู้ดูแลระบบไม่สามารถเปลี่ยนบทบาทของตนเองออกจาก ADMIN ได้" },
          { status: 400 }
        );
      }
    }

    // Check duplicate email if changing email
    if (email && email.toLowerCase().trim() !== targetUser.email.toLowerCase()) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingEmail && existingEmail.id !== targetUser.id) {
        return NextResponse.json(
          { success: false, message: "อีเมลนี้มีผู้ใช้งานแล้ว" },
          { status: 400 }
        );
      }
    }

    // Check duplicate studentOrTeacherId if changing ID
    if (studentOrTeacherId !== undefined && studentOrTeacherId !== null && studentOrTeacherId.trim() !== "") {
      const cleanId = studentOrTeacherId.trim();
      if (cleanId !== targetUser.studentOrTeacherId) {
        const existingId = await prisma.user.findFirst({
          where: { studentOrTeacherId: cleanId },
        });
        if (existingId && existingId.id !== targetUser.id) {
          return NextResponse.json(
            { success: false, message: "รหัสประจำตัวนี้มีผู้ใช้งานแล้ว" },
            { status: 400 }
          );
        }
      }
    }

    const updatedData: any = {};
    if (name !== undefined) updatedData.name = name.trim();
    if (email !== undefined) updatedData.email = email.toLowerCase().trim();
    if (studentOrTeacherId !== undefined) {
      updatedData.studentOrTeacherId = studentOrTeacherId ? studentOrTeacherId.trim() : null;
    }
    if (role !== undefined) updatedData.role = role;
    if (isActive !== undefined) updatedData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updatedData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentOrTeacherId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Record Audit Log
    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      targetId: updatedUser.id,
      targetName: updatedUser.name,
      action: "UPDATE_USER",
      details: `แก้ไขข้อมูลผู้ใช้: ${updatedUser.name} (${updatedUser.email})`,
    });

    return NextResponse.json({
      success: true,
      message: "อัปเดตข้อมูลผู้ใช้งานสำเร็จ",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin Update User Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
