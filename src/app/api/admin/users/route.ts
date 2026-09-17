import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  studentOrTeacherId: z.string().optional().nullable(),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"], {
    errorMap: () => ({ message: "บทบาทไม่ถูกต้อง" }),
  }),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถเข้าถึงได้" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    // Build where filter
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { studentOrTeacherId: { contains: search } },
      ];
    }

    if (role && (role === "ADMIN" || role === "TEACHER" || role === "STUDENT")) {
      whereClause.role = role;
    }

    if (status === "ACTIVE") {
      whereClause.isActive = true;
    } else if (status === "INACTIVE") {
      whereClause.isActive = false;
    }

    // Fetch users and summary stats in parallel
    const [users, totalUsers, studentCount, teacherCount, adminCount, activeCount, inactiveCount] =
      await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
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
        }),
        prisma.user.count(),
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.user.count({ where: { role: "TEACHER" } }),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
      ]);

    return NextResponse.json({
      success: true,
      data: users,
      summary: {
        totalUsers,
        studentCount,
        teacherCount,
        adminCount,
        activeCount,
        inactiveCount,
      },
    });
  } catch (error) {
    console.error("Admin Get Users Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
        { success: false, message: "เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถสร้างผู้ใช้งานได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || "ข้อมูลผู้ใช้ไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, studentOrTeacherId, role, password, isActive } =
      validation.data;
    const normalizedEmail = email.toLowerCase().trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanId = studentOrTeacherId?.trim() || null;

    // 1. Check duplicate email
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmailUser) {
      return NextResponse.json(
        { success: false, message: "อีเมลนี้มีผู้ใช้งานแล้ว" },
        { status: 400 }
      );
    }

    // 2. Check duplicate ID if provided
    if (cleanId) {
      const existingIdUser = await prisma.user.findFirst({
        where: { studentOrTeacherId: cleanId },
      });
      if (existingIdUser) {
        return NextResponse.json(
          { success: false, message: "รหัสประจำตัวนี้มีผู้ใช้งานแล้ว" },
          { status: 400 }
        );
      }
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create User
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: fullName,
        role,
        studentOrTeacherId: cleanId,
        isActive: isActive !== undefined ? isActive : true,
      },
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

    // 5. Audit Log
    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      targetId: newUser.id,
      targetName: newUser.name,
      action: "CREATE_USER",
      details: `สร้างผู้ใช้งานใหม่: ${newUser.name} (${newUser.email}) ในบทบาท ${newUser.role}`,
    });

    return NextResponse.json({
      success: true,
      message: "สร้างผู้ใช้งานสำเร็จ",
      data: newUser,
    });
  } catch (error) {
    console.error("Admin Create User Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
