import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "กรุณากรอกชื่อ"),
    lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
    studentOrTeacherId: z.string().optional().nullable(),
    role: z.enum(["STUDENT", "TEACHER"], {
      errorMap: () => ({ message: "บทบาทต้องเป็นนักศึกษา (STUDENT) หรืออาจารย์ (TEACHER) เท่านั้น" }),
    }),
    password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Explicitly check if role === "ADMIN" before anything else to provide specific message
    if (body.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่สามารถสมัครเป็นผู้ดูแลระบบได้",
        },
        { status: 400 }
      );
    }

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || "ข้อมูลการสมัครสมาชิกไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, studentOrTeacherId, role, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanId = studentOrTeacherId?.trim() || null;

    // 1. Check duplicate email
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmailUser) {
      return NextResponse.json(
        {
          success: false,
          message: "อีเมลนี้มีผู้ใช้งานแล้ว",
        },
        { status: 400 }
      );
    }

    // 2. Check duplicate studentOrTeacherId if provided
    if (cleanId) {
      const existingIdUser = await prisma.user.findFirst({
        where: { studentOrTeacherId: cleanId },
      });
      if (existingIdUser) {
        return NextResponse.json(
          {
            success: false,
            message: "รหัสประจำตัวนี้มีผู้ใช้งานแล้ว",
          },
          { status: 400 }
        );
      }
    }

    // 3. Hash password securely
    const passwordHash = await hashPassword(password);

    // 4. Create User in Database
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: fullName,
        role,
        studentOrTeacherId: cleanId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentOrTeacherId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // 5. Record Audit Log
    await createAuditLog({
      actorId: newUser.id,
      actorName: newUser.name,
      actorRole: newUser.role,
      targetId: newUser.id,
      targetName: newUser.name,
      action: "CREATE_USER",
      details: `สมัครสมาชิกด้วยตนเองในบทบาท ${newUser.role}`,
    });

    return NextResponse.json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      user: newUser,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง",
      },
      { status: 500 }
    );
  }
}
