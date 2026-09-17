import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const roleSchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"], {
    errorMap: () => ({ message: "บทบาทไม่ถูกต้อง (ต้องเป็น STUDENT, TEACHER หรือ ADMIN)" }),
  }),
});

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
        { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนบทบาทผู้ใช้ได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = roleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || "ข้อมูลบทบาทไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const { role } = validation.data;

    // Admin Self-Protection: Cannot change self role away from ADMIN
    if (params.id === currentUser.id && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "ผู้ดูแลระบบไม่สามารถเปลี่ยนบทบาทของตนเองออกจาก ADMIN ได้" },
        { status: 400 }
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

    const previousRole = targetUser.role;

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
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

    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      targetId: updatedUser.id,
      targetName: updatedUser.name,
      action: "CHANGE_ROLE",
      details: `เปลี่ยนบทบาทผู้ใช้: ${updatedUser.name} จาก ${previousRole} เป็น ${role}`,
    });

    return NextResponse.json({
      success: true,
      message: "เปลี่ยนบทบาทผู้ใช้งานสำเร็จ",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin Change Role Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนบทบาทผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
