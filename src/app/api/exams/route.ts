import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    if (user.role === "ADMIN") {
      const exams = await prisma.exam.findMany({
        include: {
          course: { select: { id: true, code: true, title: true } },
          _count: { select: { examQuestions: true, attempts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, exams });
    }

    if (user.role === "TEACHER") {
      const exams = await prisma.exam.findMany({
        where: {
          course: { instructorId: user.id },
        },
        include: {
          course: { select: { id: true, code: true, title: true } },
          _count: { select: { examQuestions: true, attempts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, exams });
    }

    // STUDENT Role: Get published exams in enrolled courses + student attempts
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: user.id },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);

    const exams = await prisma.exam.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        _count: { select: { examQuestions: true } },
        attempts: {
          where: { studentId: user.id },
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            totalScore: true,
            percentage: true,
          },
          orderBy: { startedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, exams });
  } catch (error) {
    console.error("GET Exams Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลแบบทดสอบ" }, { status: 500 });
  }
}
