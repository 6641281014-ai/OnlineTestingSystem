import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validations/course";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isCatalog = searchParams.get("catalog") === "true";

    let courses;
    if (user.role === "ADMIN") {
      courses = await prisma.course.findMany({
        include: {
          instructor: { select: { id: true, name: true, email: true } },
          _count: { select: { enrollments: true, questions: true, exams: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "TEACHER") {
      courses = await prisma.course.findMany({
        where: { instructorId: user.id },
        include: {
          instructor: { select: { id: true, name: true, email: true } },
          _count: { select: { enrollments: true, questions: true, exams: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Student
      if (isCatalog) {
        // Return all active courses with enrollment status
        const allCourses = await prisma.course.findMany({
          where: { isActive: true },
          include: {
            instructor: { select: { id: true, name: true, email: true } },
            _count: { select: { enrollments: true, exams: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const myEnrollments = await prisma.courseEnrollment.findMany({
          where: { studentId: user.id },
          select: { courseId: true },
        });
        const enrolledSet = new Set(myEnrollments.map((e) => e.courseId));

        courses = allCourses.map((c) => ({
          ...c,
          isEnrolled: enrolledSet.has(c.id),
        }));
      } else {
        // Enrolled courses only
        const enrollments = await prisma.courseEnrollment.findMany({
          where: { studentId: user.id },
          include: {
            course: {
              include: {
                instructor: { select: { id: true, name: true, email: true } },
                _count: { select: { enrollments: true, exams: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        });
        courses = enrollments.map((e) => ({
          ...e.course,
          enrolledAt: e.enrolledAt,
          isEnrolled: true,
        }));
      }
    }

    return NextResponse.json({ success: true, courses });
  } catch (error) {
    console.error("GET Courses Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ในการสร้างรายวิชา" }, { status: 403 });
    }

    const body = await request.json();
    const validation = courseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { code, title, description, academicYear, semester, isActive } = validation.data;

    // Check code uniqueness
    const existingCourse = await prisma.course.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existingCourse) {
      return NextResponse.json(
        { success: false, message: `รหัสวิชา ${code} มีอยู่ในระบบแล้ว` },
        { status: 409 }
      );
    }

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description?.trim() || null,
        academicYear: academicYear?.trim() || null,
        semester: semester || null,
        isActive: isActive !== undefined ? isActive : true,
        instructorId: user.id,
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "สร้างรายวิชาสำเร็จ",
      course,
    }, { status: 201 });
  } catch (error) {
    console.error("POST Course Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการสร้างรายวิชา" }, { status: 500 });
  }
}
