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

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Anti-IDOR: Teacher must own the course
    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึงแบบทดสอบในรายวิชานี้" }, { status: 403 });
    }

    // Student must be enrolled
    if (user.role === "STUDENT") {
      const isEnrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: params.id, studentId: user.id } },
      });
      if (!isEnrolled) {
        return NextResponse.json({ success: false, message: "คุณไม่ได้ลงทะเบียนในรายวิชานี้" }, { status: 403 });
      }
    }

    const whereCondition: Record<string, unknown> = {
      courseId: params.id,
    };

    // If student, only show published exams
    if (user.role === "STUDENT") {
      whereCondition.isPublished = true;
    }

    const exams = await prisma.exam.findMany({
      where: whereCondition,
      include: {
        _count: {
          select: { examQuestions: true, attempts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, exams });
  } catch (error) {
    console.error("GET Course Exams Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลแบบทดสอบ" }, { status: 500 });
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

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์สร้างแบบทดสอบ" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์สร้างแบบทดสอบในวิชาของอาจารย์ท่านอื่น" }, { status: 403 });
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

    const exam = await prisma.exam.create({
      data: {
        courseId: params.id,
        createdById: user.id,
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
        totalScore: 0,
      },
      include: {
        course: { select: { code: true, title: true } },
        _count: { select: { examQuestions: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "สร้างชุดแบบทดสอบสำเร็จ",
      exam,
    }, { status: 201 });
  } catch (error) {
    console.error("POST Course Exam Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการสร้างแบบทดสอบ" }, { status: 500 });
  }
}
