import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validations/course";

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
      include: {
        instructor: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
        categories: {
          include: {
            _count: { select: { questions: true } },
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { enrollments: true, questions: true, exams: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชานี้ในระบบ" }, { status: 404 });
    }

    // Permission check
    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้" }, { status: 403 });
    }

    if (user.role === "STUDENT") {
      const isEnrolled = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: { courseId: params.id, studentId: user.id },
        },
      });
      if (!isEnrolled) {
        return NextResponse.json({ success: false, message: "คุณไม่ได้ลงทะเบียนในรายวิชานี้" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("GET Course Details Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา" }, { status: 500 });
  }
}

export async function PUT(
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
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชานี้ในระบบ" }, { status: 404 });
    }

    // Anti-IDOR check
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขรายวิชานี้" }, { status: 403 });
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

    // Check code uniqueness if changed
    if (code.trim().toUpperCase() !== course.code) {
      const codeExists = await prisma.course.findUnique({
        where: { code: code.trim().toUpperCase() },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, message: `รหัสวิชา ${code} มีอยู่ในระบบแล้ว` },
          { status: 409 }
        );
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description?.trim() || null,
        academicYear: academicYear?.trim() || null,
        semester: semester || null,
        isActive: isActive !== undefined ? isActive : course.isActive,
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลรายวิชาสำเร็จ",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("PUT Course Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการแก้ไขรายวิชา" }, { status: 500 });
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
      include: {
        exams: {
          include: {
            _count: { select: { attempts: true } },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชานี้ในระบบ" }, { status: 404 });
    }

    // Anti-IDOR check
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ลบรายวิชานี้" }, { status: 403 });
    }

    // Check if any exam in this course has student attempts
    const hasAttempts = course.exams.some((exam) => exam._count.attempts > 0);

    // Also check if any question in this course has student answers
    const studentAnswersCount = await prisma.studentAnswer.count({
      where: {
        question: {
          courseId: params.id,
        },
      },
    });

    if (hasAttempts || studentAnswersCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่สามารถลบรายวิชานี้ได้ เนื่องจากมีประวัติการเข้าสอบและผลสัมฤทธิ์ทางการเรียนของนักศึกษาแล้ว เพื่อรักษาความถูกต้องของข้อมูลงานวิจัย",
        },
        { status: 400 }
      );
    }

    // Explicit ordered deletion in transaction to guarantee clean deletion without foreign key conflicts
    await prisma.$transaction(async (tx) => {
      // 1. Delete ExamQuestion links
      await tx.examQuestion.deleteMany({
        where: {
          exam: { courseId: params.id },
        },
      });

      // 2. Delete Exams
      await tx.exam.deleteMany({
        where: { courseId: params.id },
      });

      // 3. Delete Choices
      await tx.choice.deleteMany({
        where: {
          question: { courseId: params.id },
        },
      });

      // 4. Delete Questions
      await tx.question.deleteMany({
        where: { courseId: params.id },
      });

      // 5. Delete Categories
      await tx.questionCategory.deleteMany({
        where: { courseId: params.id },
      });

      // 6. Delete Enrollments
      await tx.courseEnrollment.deleteMany({
        where: { courseId: params.id },
      });

      // 7. Delete Course
      await tx.course.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "ลบรายวิชาเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Course Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการลบรายวิชา" }, { status: 500 });
  }
}
