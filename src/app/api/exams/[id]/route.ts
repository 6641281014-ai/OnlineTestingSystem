import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { examSchema } from "@/lib/validations/exam";

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

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            instructorId: true,
            instructor: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { examQuestions: true, attempts: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบนี้" }, { status: 404 });
    }

    // Permission check for Teacher
    if (user.role === "TEACHER" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงแบบทดสอบนี้" }, { status: 403 });
    }

    // Permission check for Student
    if (user.role === "STUDENT") {
      if (!exam.isPublished) {
        return NextResponse.json({ success: false, message: "แบบทดสอบนี้ยังไม่เปิดให้เข้าสอบ" }, { status: 403 });
      }

      const isEnrolled = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: { courseId: exam.courseId, studentId: user.id },
        },
      });

      if (!isEnrolled) {
        return NextResponse.json({ success: false, message: "คุณไม่ได้ลงทะเบียนในรายวิชานี้" }, { status: 403 });
      }

      // Fetch student's attempt in this exam
      const latestAttempt = await prisma.examAttempt.findFirst({
        where: { examId: params.id, studentId: user.id },
        orderBy: { attemptNumber: "desc" },
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          timeSpentSeconds: true,
          totalScore: true,
          percentage: true,
        },
      });

      return NextResponse.json({
        success: true,
        exam,
        attempt: latestAttempt,
        serverTime: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      exam,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET Exam Details Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลแบบทดสอบ" }, { status: 500 });
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

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: { course: true },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบนี้" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขแบบทดสอบนี้" }, { status: 403 });
    }

    const body = await request.json();
    const validation = examSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const data = validation.data;

    const updatedExam = await prisma.exam.update({
      where: { id: params.id },
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        examType: data.examType,
        durationMinutes: data.durationMinutes,
        passingScore: data.passingScore,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        shuffleQuestions: data.shuffleQuestions,
        shuffleChoices: data.shuffleChoices,
        maxAttempts: data.maxAttempts,
        showScoreImmediately: data.showScoreImmediately,
        allowReview: data.allowReview,
        isPublished: data.isPublished,
      },
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขแบบทดสอบสำเร็จ",
      exam: updatedExam,
    });
  } catch (error) {
    console.error("PUT Exam Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการแก้ไขแบบทดสอบ" }, { status: 500 });
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

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        _count: { select: { attempts: true } },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "ไม่พบแบบทดสอบนี้" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && exam.course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ลบแบบทดสอบนี้" }, { status: 403 });
    }

    // Referential Integrity Check: If exam has student attempts, block delete!
    if (exam._count.attempts > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่สามารถลบแบบทดสอบนี้ได้เนื่องจากมีนักศึกษาเข้าทำแบบทดสอบแล้ว เพื่อรักษาความถูกต้องของข้อมูลประวัติการสอบ",
        },
        { status: 400 }
      );
    }

    // Delete ExamQuestions and Exam
    await prisma.$transaction([
      prisma.examQuestion.deleteMany({ where: { examId: params.id } }),
      prisma.exam.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "ลบแบบทดสอบเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Exam Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการลบแบบทดสอบ" }, { status: 500 });
  }
}
