import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  calculateNormalizedGain,
  calculatePercentageImprovement,
} from "@/lib/analytics";

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

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือผู้ดูแลระบบเท่านั้น" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        enrollments: {
          include: {
            student: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
          },
          orderBy: { student: { name: "asc" } },
        },
        exams: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ดูความก้าวหน้าของวิชานี้" }, { status: 403 });
    }

    const preTests = course.exams.filter((e) => e.examType === "PRE_TEST");
    const postTests = course.exams.filter((e) => e.examType === "POST_TEST");

    const { searchParams } = new URL(request.url);
    const requestedPreId = searchParams.get("preId");
    const requestedPostId = searchParams.get("postId");

    let preExam = preTests.length > 0 ? preTests[0] : course.exams[0] || null;
    let postExam =
      postTests.length > 0
        ? postTests[0]
        : course.exams.find((e) => e.id !== preExam?.id) || course.exams[course.exams.length - 1] || null;

    if (requestedPreId) {
      const found = course.exams.find((e) => e.id === requestedPreId);
      if (found) preExam = found;
    }

    if (requestedPostId) {
      const found = course.exams.find((e) => e.id === requestedPostId);
      if (found) postExam = found;
    }

    let preAttemptsMap = new Map<string, any>();
    let postAttemptsMap = new Map<string, any>();

    if (preExam) {
      const preAtts = await prisma.examAttempt.findMany({
        where: { examId: preExam.id, status: { in: ["SUBMITTED", "TIMED_OUT"] } },
        orderBy: { submittedAt: "desc" },
      });
      for (const att of preAtts) {
        if (!preAttemptsMap.has(att.studentId)) preAttemptsMap.set(att.studentId, att);
      }
    }

    if (postExam) {
      const postAtts = await prisma.examAttempt.findMany({
        where: { examId: postExam.id, status: { in: ["SUBMITTED", "TIMED_OUT"] } },
        orderBy: { submittedAt: "desc" },
      });
      for (const att of postAtts) {
        if (!postAttemptsMap.has(att.studentId)) postAttemptsMap.set(att.studentId, att);
      }
    }

    const progressList = course.enrollments.map((enr) => {
      const student = enr.student;
      const preAtt = preAttemptsMap.get(student.id);
      const postAtt = postAttemptsMap.get(student.id);

      const hasPre = !!preAtt;
      const hasPost = !!postAtt;

      const preScore = preAtt ? preAtt.totalScore : null;
      const preMax = preExam ? preExam.totalScore : 0;
      const prePercent =
        preAtt && preMax > 0
          ? Number(((preAtt.totalScore / preMax) * 100).toFixed(1))
          : preAtt
          ? Number(preAtt.percentage.toFixed(1))
          : null;

      const postScore = postAtt ? postAtt.totalScore : null;
      const postMax = postExam ? postExam.totalScore : 0;
      const postPercent =
        postAtt && postMax > 0
          ? Number(((postAtt.totalScore / postMax) * 100).toFixed(1))
          : postAtt
          ? Number(postAtt.percentage.toFixed(1))
          : null;

      let scoreDiff: number | null = null;
      let percentageImprovement: number | null = null;
      let gain: number | null = null;
      let gainLevel: "HIGH" | "MEDIUM" | "LOW" | "INCOMPLETE" = "INCOMPLETE";
      let gainLevelText = "ยังสอบไม่ครบ";
      let isPassed = false;

      if (hasPre && hasPost && prePercent !== null && postPercent !== null) {
        scoreDiff = Number((postPercent - prePercent).toFixed(1));
        percentageImprovement = calculatePercentageImprovement(prePercent, postPercent);
        const gainCalc = calculateNormalizedGain(prePercent, postPercent);
        gain = gainCalc.gain;
        gainLevel = gainCalc.gainLevel;
        gainLevelText = gainCalc.gainLevelText;
      }

      if (hasPost && postScore !== null && postExam) {
        isPassed = postScore >= postExam.passingScore;
      }

      return {
        studentId: student.id,
        studentName: student.name,
        studentCode: student.studentOrTeacherId || "-",
        studentEmail: student.email,
        hasPre,
        hasPost,
        isCompletedBoth: hasPre && hasPost,
        preScore,
        preMax,
        prePercent,
        preSubmittedAt: preAtt?.submittedAt || null,
        postScore,
        postMax,
        postPercent,
        postSubmittedAt: postAtt?.submittedAt || null,
        scoreDiff,
        percentageImprovement,
        gain,
        gainLevel,
        gainLevelText,
        isPassed,
      };
    });

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        instructorName: course.instructor?.name || "-",
        totalEnrollments: course.enrollments.length,
      },
      preExam: preExam
        ? { id: preExam.id, title: preExam.title, totalScore: preExam.totalScore }
        : null,
      postExam: postExam
        ? { id: postExam.id, title: postExam.title, totalScore: postExam.totalScore }
        : null,
      availableExams: course.exams.map((e) => ({ id: e.id, title: e.title, examType: e.examType })),
      students: progressList,
    });
  } catch (error) {
    console.error("GET Student Progress Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลความก้าวหน้า" },
      { status: 500 }
    );
  }
}
