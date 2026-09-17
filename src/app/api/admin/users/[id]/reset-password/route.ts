import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(
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
        { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถรีเซ็ตรหัสผ่านได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || "ข้อมูลรหัสผ่านไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const { newPassword } = validation.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" },
        { status: 404 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash },
    });

    // Record Audit Log (DO NOT log password)
    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      targetId: targetUser.id,
      targetName: targetUser.name,
      action: "RESET_PASSWORD",
      details: `รีเซ็ตรหัสผ่านให้ผู้ใช้: ${targetUser.name} (${targetUser.email})`,
    });

    return NextResponse.json({
      success: true,
      message: "รีเซ็ตรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("Admin Reset Password Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" },
      { status: 500 }
    );
  }
}
