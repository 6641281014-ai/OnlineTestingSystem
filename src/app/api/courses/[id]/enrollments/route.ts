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
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้" }, { status: 403 });
    }

    // Get enrolled students
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: params.id },
      include: {
        student: {
          select: { id: true, name: true, email: true, studentOrTeacherId: true, isActive: true },
        },
      },
      orderBy: { enrolledAt: "asc" },
    });

    // Get all students for enrolling selector
    const enrolledStudentIds = enrollments.map((e) => e.studentId);
    const availableStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        id: { notIn: enrolledStudentIds },
      },
      select: { id: true, name: true, email: true, studentOrTeacherId: true },
      orderBy: { studentOrTeacherId: "asc" },
    });

    return NextResponse.json({
      success: true,
      enrollments,
      availableStudents,
    });
  } catch (error) {
    console.error("GET Course Enrollments Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลนักศึกษา" }, { status: 500 });
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

    // Anti-IDOR: Only Course Owner or Admin can enroll students
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการนักศึกษาในรายวิชานี้" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุรหัสนักศึกษา" }, { status: 400 });
    }

    // Check student exists and has role STUDENT
    const targetStudent = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!targetStudent || targetStudent.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "ผู้ใช้นี้ไม่ใช่นักศึกษา หรือไม่พบในระบบ" },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existing = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: { courseId: params.id, studentId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "นักศึกษาคนนี้ได้ลงทะเบียนในรายวิชานี้แล้ว" },
        { status: 409 }
      );
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: params.id,
        studentId,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, studentOrTeacherId: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `เพิ่มนักศึกษา ${targetStudent.name} เข้าสู่รายวิชาเรียบร้อยแล้ว`,
      enrollment,
    }, { status: 201 });
  } catch (error) {
    console.error("POST Enrollment Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการลงทะเบียนนักศึกษา" }, { status: 500 });
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

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการนักศึกษาในรายวิชานี้" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ studentId" }, { status: 400 });
    }

    await prisma.courseEnrollment.delete({
      where: {
        courseId_studentId: { courseId: params.id, studentId },
      },
    });

    return NextResponse.json({
      success: true,
      message: "ถอนนักศึกษาออกจากรายวิชาเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Enrollment Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการถอนนักศึกษา" }, { status: 500 });
  }
}
