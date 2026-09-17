import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    // Role check: Only STUDENT can use self-enrollment
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "เฉพาะนักศึกษาเท่านั้นที่สามารถลงทะเบียนเรียนด้วยตนเองได้" },
        { status: 403 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: { select: { name: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชานี้ในระบบ" }, { status: 404 });
    }

    // Check duplicate enrollment using strictly session studentId (Anti-IDOR)
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: params.id,
          studentId: user.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, message: "คุณได้ลงทะเบียนในรายวิชานี้ไปแล้ว" },
        { status: 409 }
      );
    }

    // Create Enrollment using session studentId
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: params.id,
        studentId: user.id,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `ลงทะเบียนเรียนวิชา ${course.code} ${course.title} สำเร็จ`,
        enrollment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Student Self-Enroll Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการลงทะเบียนเรียน" },
      { status: 500 }
    );
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

    // Role check: Only STUDENT can use self-unenrollment
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "เฉพาะนักศึกษาเท่านั้นที่สามารถถอนการลงทะเบียนด้วยตนเองได้" },
        { status: 403 }
      );
    }

    // Check if the current user is enrolled in this course
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: params.id,
          studentId: user.id,
        },
      },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    if (!existingEnrollment) {
      return NextResponse.json(
        { success: false, message: "ไม่พบประวัติการลงทะเบียนในรายวิชานี้ของคุณ" },
        { status: 404 }
      );
    }

    // Check if student has exam attempts in this course to protect exam records
    const attemptCount = await prisma.examAttempt.count({
      where: {
        studentId: user.id,
        exam: { courseId: params.id },
      },
    });

    if (attemptCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่สามารถถอนการลงทะเบียนได้เนื่องจากคุณมีประวัติการทำแบบทดสอบในรายวิชานี้แล้ว เพื่อรักษาความถูกต้องของข้อมูลประวัติการสอบ กรุณาติดต่ออาจารย์ผู้สอน",
        },
        { status: 400 }
      );
    }

    // Delete enrollment
    await prisma.courseEnrollment.delete({
      where: {
        courseId_studentId: {
          courseId: params.id,
          studentId: user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `ถอนการลงทะเบียนวิชา ${existingEnrollment.course.code} เรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error("DELETE Student Unenroll Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการถอนการลงทะเบียน" },
      { status: 500 }
    );
  }
}
