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

    // Anti-IDOR: Teachers can only view analytics of their own courses
    if (user.role === "TEACHER" && course.instructorId !== user.id) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ดูผลวิเคราะห์ของวิชานี้" }, { status: 403 });
    }

    // Fetch all exams in the course with attempt counts
    const allExams = await prisma.exam.findMany({
      where: { courseId: params.id },
      include: {
        _count: {
          select: {
            attempts: { where: { status: { in: ["SUBMITTED", "TIMED_OUT"] } } },
            examQuestions: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedAllExams = allExams.map((e) => ({
      id: e.id,
      title: e.title,
      examType: e.examType,
      totalScore: e.totalScore,
      passingScore: e.passingScore,
      isPublished: e.isPublished,
      questionsCount: e._count.examQuestions,
      submittedAttemptsCount: e._count.attempts,
    }));

    if (allExams.length === 0) {
      return NextResponse.json({
        success: true,
        hasExams: false,
        hasComparisonPair: false,
        message: "รายวิชานี้ยังไม่มีชุดแบบทดสอบ",
        course: { id: course.id, code: course.code, title: course.title, enrollmentsCount: course._count.enrollments },
        allExams: [],
        analytics: null,
      });
    }

    if (allExams.length === 1) {
      return NextResponse.json({
        success: true,
        hasExams: true,
        hasComparisonPair: false,
        message: "รายวิชานี้มีแบบทดสอบ 1 ชุด กรุณาสร้างชุดแบบทดสอบเพิ่มเติม (เช่น Post-test) เพื่อนำมาเปรียบเทียบผลสัมฤทธิ์ทางการเรียน",
        course: { id: course.id, code: course.code, title: course.title, enrollmentsCount: course._count.enrollments },
        allExams: formattedAllExams,
        singleExam: formattedAllExams[0],
        analytics: null,
      });
    }

    // Separate by PRE_TEST and POST_TEST or fallback to available exams
    const preTests = allExams.filter((e) => e.examType === "PRE_TEST");
    const postTests = allExams.filter((e) => e.examType === "POST_TEST");

    const { searchParams } = new URL(request.url);
    const requestedPreId = searchParams.get("preId");
    const requestedPostId = searchParams.get("postId");

    // Smart default selection
    let defaultPreExam = preTests.length > 0 ? preTests[0] : allExams[0];
    let defaultPostExam =
      postTests.length > 0
        ? postTests[0]
        : allExams.find((e) => e.id !== defaultPreExam.id) || allExams[allExams.length - 1];

    if (requestedPreId) {
      const found = allExams.find((e) => e.id === requestedPreId);
      if (found) defaultPreExam = found;
    }

    if (requestedPostId) {
      const found = allExams.find((e) => e.id === requestedPostId);
      if (found) defaultPostExam = found;
    }

    // Fetch questions and answers for item analysis
    const [preExamDetails, postExamDetails] = await Promise.all([
      prisma.exam.findUnique({
        where: { id: defaultPreExam.id },
        include: {
          examQuestions: {
            include: { question: { select: { id: true, questionText: true, questionType: true, difficulty: true } } },
            orderBy: { orderIndex: "asc" },
          },
        },
      }),
      prisma.exam.findUnique({
        where: { id: defaultPostExam.id },
        include: {
          examQuestions: {
            include: { question: { select: { id: true, questionText: true, questionType: true, difficulty: true } } },
            orderBy: { orderIndex: "asc" },
          },
        },
      }),
    ]);

    // Fetch all submitted attempts for both exams
    const [preAttemptsRaw, postAttemptsRaw] = await Promise.all([
      prisma.examAttempt.findMany({
        where: {
          examId: defaultPreExam.id,
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
          examId: defaultPostExam.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        include: {
          student: { select: { id: true, name: true, email: true, studentOrTeacherId: true } },
          answers: { select: { questionId: true, isCorrect: true, earnedScore: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    // Deduplicate attempts by studentId (keep latest submitted attempt)
    const preAttemptMap = new Map<string, typeof preAttemptsRaw[0]>();
    for (const att of preAttemptsRaw) {
      if (!preAttemptMap.has(att.studentId)) {
        preAttemptMap.set(att.studentId, att);
      }
    }

    const postAttemptMap = new Map<string, typeof postAttemptsRaw[0]>();
    for (const att of postAttemptsRaw) {
      if (!postAttemptMap.has(att.studentId)) {
        postAttemptMap.set(att.studentId, att);
      }
    }

    const studentGains: StudentGainResult[] = [];
    const preOnlyStudents: Array<{ id: string; name: string; code: string; score: number; percent: number }> = [];
    const postOnlyStudents: Array<{ id: string; name: string; code: string; score: number; percent: number }> = [];

    const prePercentList: number[] = [];
    const postPercentList: number[] = [];

    // Find matched students
    postAttemptMap.forEach((postAtt, studentId) => {
      const preAtt = preAttemptMap.get(studentId);
      if (preAtt) {
        const prePercent =
          defaultPreExam.totalScore > 0
            ? (preAtt.totalScore / defaultPreExam.totalScore) * 100
            : preAtt.percentage;

        const postPercent =
          defaultPostExam.totalScore > 0
            ? (postAtt.totalScore / defaultPostExam.totalScore) * 100
            : postAtt.percentage;

        const scoreDiff = Number((postPercent - prePercent).toFixed(1));
        const imp = calculatePercentageImprovement(prePercent, postPercent);
        const { gain, gainLevel, gainLevelText } = calculateNormalizedGain(prePercent, postPercent);
        const isPassed = postAtt.totalScore >= defaultPostExam.passingScore;

        prePercentList.push(prePercent);
        postPercentList.push(postPercent);

        studentGains.push({
          studentId: postAtt.studentId,
          studentName: postAtt.student.name,
          studentCode: postAtt.student.studentOrTeacherId || "-",
          preTestScore: preAtt.totalScore,
          preTestTotal: defaultPreExam.totalScore,
          preTestPercent: Number(prePercent.toFixed(1)),
          postTestScore: postAtt.totalScore,
          postTestTotal: defaultPostExam.totalScore,
          postTestPercent: Number(postPercent.toFixed(1)),
          scoreDifference: scoreDiff,
          percentageImprovement: imp,
          gain,
          gainLevel,
          gainLevelText,
          isPassed,
        });
      } else {
        postOnlyStudents.push({
          id: postAtt.student.id,
          name: postAtt.student.name,
          code: postAtt.student.studentOrTeacherId || "-",
          score: postAtt.totalScore,
          percent: Number(postAtt.percentage.toFixed(1)),
        });
      }
    });

    // Find students who took only Pre-test
    preAttemptMap.forEach((preAtt, studentId) => {
      if (!postAttemptMap.has(studentId)) {
        preOnlyStudents.push({
          id: preAtt.student.id,
          name: preAtt.student.name,
          code: preAtt.student.studentOrTeacherId || "-",
          score: preAtt.totalScore,
          percent: Number(preAtt.percentage.toFixed(1)),
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
    let hakeClassGainLevelText = "ยังไม่มีข้อมูลนักเรียนที่สอบครบทั้งสองชุด";
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

      // Run Paired t-test
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

    // Calculate Item Analysis for Post-test questions
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
      hasExams: true,
      hasComparisonPair: true,
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        instructorName: course.instructor?.name || "-",
        enrollmentsCount: course._count.enrollments,
      },
      allExams: formattedAllExams,
      preExam: {
        id: defaultPreExam.id,
        title: defaultPreExam.title,
        examType: defaultPreExam.examType,
        totalScore: defaultPreExam.totalScore,
        submittedCount: preAttemptMap.size,
      },
      postExam: {
        id: defaultPostExam.id,
        title: defaultPostExam.title,
        examType: defaultPostExam.examType,
        totalScore: defaultPostExam.totalScore,
        submittedCount: postAttemptMap.size,
      },
      analytics: classAnalytics,
      postItemAnalysis,
      unmatchedSummary: {
        preOnlyCount: preOnlyStudents.length,
        postOnlyCount: postOnlyStudents.length,
        preOnlyStudents,
        postOnlyStudents,
      },
    });
  } catch (error) {
    console.error("GET Pre/Post Test Analytics Error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการวิเคราะห์ผลสัมฤทธิ์ทางการเรียน" },
      { status: 500 }
    );
  }
}
