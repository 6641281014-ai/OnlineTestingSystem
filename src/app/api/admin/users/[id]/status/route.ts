import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  isActive: z.boolean({ required_error: "กรุณาระบุสถานะการใช้งาน (isActive)" }),
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
        { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนสถานะผู้ใช้ได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = statusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || "ข้อมูลสถานะไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const { isActive } = validation.data;

    // Admin Self-Protection: Cannot deactivate self
    if (params.id === currentUser.id && isActive === false) {
      return NextResponse.json(
        { success: false, message: "ผู้ดูแลระบบไม่สามารถปิดการใช้งานบัญชีตนเองได้" },
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

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { isActive },
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

    const action = isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER";
    const actionDesc = isActive ? "เปิดการใช้งาน" : "ปิดการใช้งาน / ระงับบัญชี";

    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      targetId: updatedUser.id,
      targetName: updatedUser.name,
      action,
      details: `${actionDesc} ผู้ใช้: ${updatedUser.name} (${updatedUser.email})`,
    });

    return NextResponse.json({
      success: true,
      message: `${actionDesc}สำเร็จ`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin Update Status Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
