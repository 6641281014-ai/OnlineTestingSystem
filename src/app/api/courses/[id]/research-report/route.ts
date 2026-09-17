import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  calculateNormalizedGain,
  calculatePercentageImprovement,
  calculateMedian,
  calculatePairedTTest,
  calculateItemAnalysis,
  PrePostClassAnalytics,
  StudentGainResult,
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
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "ไม่พบรายวิชา" }, { status: 404 });
    }

    // Anti-IDOR
    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ดูรายงานวิจัยของวิชานี้" }, { status: 403 });
    }

    const allExams = await prisma.exam.findMany({
      where: { courseId: params.id },
      orderBy: { createdAt: "asc" },
    });

    if (allExams.length === 0) {
      return NextResponse.json({
        success: true,
        hasData: false,
        message: "รายวิชานี้ยังไม่มีชุดแบบทดสอบสำหรับสร้างรายงานวิจัย",
      });
    }

    const preTests = allExams.filter((e) => e.examType === "PRE_TEST");
    const postTests = allExams.filter((e) => e.examType === "POST_TEST");

    const { searchParams } = new URL(request.url);
    const requestedPreId = searchParams.get("preId");
    const requestedPostId = searchParams.get("postId");

    let preExam = preTests.length > 0 ? preTests[0] : allExams[0];
    let postExam =
      postTests.length > 0
        ? postTests[0]
        : allExams.find((e) => e.id !== preExam.id) || allExams[allExams.length - 1];

    if (requestedPreId) {
      const found = allExams.find((e) => e.id === requestedPreId);
      if (found) preExam = found;
    }

    if (requestedPostId) {
      const found = allExams.find((e) => e.id === requestedPostId);
      if (found) postExam = found;
    }

    const postExamDetails = await prisma.exam.findUnique({
      where: { id: postExam.id },
      include: {
        examQuestions: {
          include: { question: { select: { id: true, questionText: true, questionType: true, difficulty: true } } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    const [preAttemptsRaw, postAttemptsRaw] = await Promise.all([
      prisma.examAttempt.findMany({
        where: {
          examId: preExam.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        include: {
          student: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
          answers: { select: { questionId: true, isCorrect: true, earnedScore: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.examAttempt.findMany({
        where: {
          examId: postExam.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        include: {
          student: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
          answers: { select: { questionId: true, isCorrect: true, earnedScore: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    const preAttemptMap = new Map<string, typeof preAttemptsRaw[0]>();
    for (const att of preAttemptsRaw) {
      if (!preAttemptMap.has(att.studentId)) preAttemptMap.set(att.studentId, att);
    }

    const postAttemptMap = new Map<string, typeof postAttemptsRaw[0]>();
    for (const att of postAttemptsRaw) {
      if (!postAttemptMap.has(att.studentId)) postAttemptMap.set(att.studentId, att);
    }

    const studentGains: StudentGainResult[] = [];
    const prePercentList: number[] = [];
    const postPercentList: number[] = [];

    postAttemptMap.forEach((postAtt, studentId) => {
      const preAtt = preAttemptMap.get(studentId);
      if (preAtt) {
        const prePercent =
          preExam.totalScore > 0 ? (preAtt.totalScore / preExam.totalScore) * 100 : preAtt.percentage;
        const postPercent =
          postExam.totalScore > 0 ? (postAtt.totalScore / postExam.totalScore) * 100 : postAtt.percentage;

        const scoreDiff = Number((postPercent - prePercent).toFixed(1));
        const imp = calculatePercentageImprovement(prePercent, postPercent);
        const { gain, gainLevel, gainLevelText } = calculateNormalizedGain(prePercent, postPercent);
        const isPassed = postAtt.totalScore >= postExam.passingScore;

        prePercentList.push(prePercent);
        postPercentList.push(postPercent);

        studentGains.push({
          studentId: postAtt.studentId,
          studentName: postAtt.student.name,
          studentCode: postAtt.student.studentOrTeacherId || "-",
          preTestScore: preAtt.totalScore,
          preTestTotal: preExam.totalScore,
          preTestPercent: Number(prePercent.toFixed(1)),
          postTestScore: postAtt.totalScore,
          postTestTotal: postExam.totalScore,
          postTestPercent: Number(postPercent.toFixed(1)),
          scoreDifference: scoreDiff,
          percentageImprovement: imp,
          gain,
          gainLevel,
          gainLevelText,
          isPassed,
        });
      }
    });

    const n = studentGains.length;
    let avgPrePercent = 0;
    let avgPostPercent = 0;
    let medianPrePercent = 0;
    let medianPostPercent = 0;
    let sdPrePercent = 0;
    let sdPostPercent = 0;
    let minPrePercent = 0;
    let maxPrePercent = 0;
    let minPostPercent = 0;
    let maxPostPercent = 0;
    let meanDifference = 0;
    let classPercentageImprovement = 0;
    let classAverageGain = 0;
    let hakeClassGain = 0;
    let hakeClassGainLevelText = "ยังไม่มีข้อมูล";
    let passRate = 0;
    let highGainCount = 0;
    let mediumGainCount = 0;
    let lowGainCount = 0;

    let tTestResult = null;

    if (n > 0) {
      avgPrePercent = Number((prePercentList.reduce((sum, v) => sum + v, 0) / n).toFixed(2));
      avgPostPercent = Number((postPercentList.reduce((sum, v) => sum + v, 0) / n).toFixed(2));
      medianPrePercent = calculateMedian(prePercentList);
      medianPostPercent = calculateMedian(postPercentList);

      minPrePercent = Math.min(...prePercentList);
      maxPrePercent = Math.max(...prePercentList);
      minPostPercent = Math.min(...postPercentList);
      maxPostPercent = Math.max(...postPercentList);

      if (n > 1) {
        const varPre = prePercentList.reduce((sum, v) => sum + Math.pow(v - avgPrePercent, 2), 0) / (n - 1);
        const varPost = postPercentList.reduce((sum, v) => sum + Math.pow(v - avgPostPercent, 2), 0) / (n - 1);
        sdPrePercent = Number(Math.sqrt(varPre).toFixed(2));
        sdPostPercent = Number(Math.sqrt(varPost).toFixed(2));
      }

      meanDifference = Number((avgPostPercent - avgPrePercent).toFixed(2));
      classPercentageImprovement = calculatePercentageImprovement(avgPrePercent, avgPostPercent);
      classAverageGain = Number((studentGains.reduce((sum, s) => sum + s.gain, 0) / n).toFixed(3));

      const hake = calculateNormalizedGain(avgPrePercent, avgPostPercent);
      hakeClassGain = hake.gain;
      hakeClassGainLevelText = hake.gainLevelText;

      const passedCount = studentGains.filter((s) => s.isPassed).length;
      passRate = Number(((passedCount / n) * 100).toFixed(1));

      highGainCount = studentGains.filter((s) => s.gainLevel === "HIGH").length;
      mediumGainCount = studentGains.filter((s) => s.gainLevel === "MEDIUM").length;
      lowGainCount = studentGains.filter((s) => s.gainLevel === "LOW").length;

      tTestResult = calculatePairedTTest(prePercentList, postPercentList);
    }

    const classAnalytics: PrePostClassAnalytics = {
      totalMatchedStudents: n,
      avgPrePercent,
      avgPostPercent,
      medianPrePercent,
      medianPostPercent,
      sdPrePercent,
      sdPostPercent,
      minPrePercent,
      maxPrePercent,
      minPostPercent,
      maxPostPercent,
      meanDifference,
      classPercentageImprovement,
      classAverageGain,
      hakeClassGain,
      hakeClassGainLevelText,
      passRate,
      highGainCount,
      mediumGainCount,
      lowGainCount,
      studentGains,
      tTest: tTestResult,
    };

    let postItemAnalysis = null;
    if (postExamDetails && postExamDetails.examQuestions.length > 0) {
      const qFormatted = postExamDetails.examQuestions.map((eq) => ({
        id: eq.question.id,
        questionText: eq.question.questionText,
        questionType: eq.question.questionType,
        difficulty: eq.question.difficulty,
        score: eq.score,
      }));
      postItemAnalysis = calculateItemAnalysis(qFormatted, postAttemptsRaw);
    }

    return NextResponse.json({
      success: true,
      hasData: true,
      reportDate: new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        instructorName: course.instructor?.name || "-",
        enrollmentsCount: course._count.enrollments,
      },
      preExam: { id: preExam.id, title: preExam.title, totalScore: preExam.totalScore, participantsCount: preAttemptMap.size },
      postExam: { id: postExam.id, title: postExam.title, totalScore: postExam.totalScore, participantsCount: postAttemptMap.size },
      analytics: classAnalytics,
      postItemAnalysis,
    });
  } catch (error) {
    console.error("GET Research Report Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการสร้างรายงานวิจัย" },
      { status: 500 }
    );
  }
}
