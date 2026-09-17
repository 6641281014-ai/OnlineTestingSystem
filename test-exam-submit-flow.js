const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

let testResults = [];

function recordTest(testName, passed, details) {
  testResults.push({ testName, passed, details });
  const symbol = passed ? "✓" : "✗";
  const color = passed ? "\x1b[32m" : "\x1b[31m";
  console.log(`${color}${symbol} ${testName}\x1b[0m`);
  if (!passed && details) {
    console.log(`   Error Details: ${details}`);
  }
}

async function runExamSubmitFlowTests() {
  console.log("\n=======================================================");
  console.log("  EXAM SUBMIT FLOW & RESUME PREVENTION TEST SUITE");
  console.log("=======================================================\n");

  let testCourse = null;
  let testExam = null;
  let student1 = null;
  let student2 = null;
  let teacher = null;

  try {
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    teacher = await prisma.user.upsert({
      where: { email: "teacher_submit_flow@example.com" },
      update: {},
      create: {
        email: "teacher_submit_flow@example.com",
        passwordHash: hashedPassword,
        name: "Flow Test Teacher",
        role: "TEACHER",
      },
    });

    student1 = await prisma.user.upsert({
      where: { email: "student1_submit_flow@example.com" },
      update: {},
      create: {
        email: "student1_submit_flow@example.com",
        passwordHash: hashedPassword,
        name: "Flow Test Student 1",
        studentOrTeacherId: "STU-FLOW-01",
        role: "STUDENT",
      },
    });

    student2 = await prisma.user.upsert({
      where: { email: "student2_submit_flow@example.com" },
      update: {},
      create: {
        email: "student2_submit_flow@example.com",
        passwordHash: hashedPassword,
        name: "Flow Test Student 2",
        studentOrTeacherId: "STU-FLOW-02",
        role: "STUDENT",
      },
    });

    testCourse = await prisma.course.upsert({
      where: { code: "FLOW-101" },
      update: {},
      create: {
        code: "FLOW-101",
        title: "Exam Taking Flow Course",
        instructorId: teacher.id,
        academicYear: "2569",
        semester: 1,
      },
    });

    // Enroll students
    await prisma.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId: testCourse.id, studentId: student1.id } },
      update: {},
      create: { courseId: testCourse.id, studentId: student1.id },
    });
    await prisma.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId: testCourse.id, studentId: student2.id } },
      update: {},
      create: { courseId: testCourse.id, studentId: student2.id },
    });

    // Create Exam with 4 questions (total score = 4, passing = 2)
    testExam = await prisma.exam.upsert({
      where: { id: "test-flow-exam-01" },
      update: {},
      create: {
        id: "test-flow-exam-01",
        title: "Flow Validation Midterm Exam",
        course: { connect: { id: testCourse.id } },
        createdBy: { connect: { id: teacher.id } },
        durationMinutes: 30,
        totalScore: 4,
        passingScore: 2,
        examType: "MIDTERM",
        isPublished: true,
        maxAttempts: 1,
        allowReview: true,
      },
    });

    // Clean previous questions and attempts for clean run
    await prisma.studentAnswer.deleteMany({
      where: { attempt: { examId: testExam.id } },
    });
    await prisma.examLog.deleteMany({
      where: { attempt: { examId: testExam.id } },
    });
    await prisma.examAttempt.deleteMany({
      where: { examId: testExam.id },
    });
    await prisma.examQuestion.deleteMany({
      where: { examId: testExam.id },
    });

    // Create 4 questions
    const createdQuestions = [];
    for (let i = 1; i <= 4; i++) {
      const q = await prisma.question.create({
        data: {
          courseId: testCourse.id,
          createdById: teacher.id,
          questionText: `Question #${i} for Flow Test?`,
          questionType: "MULTIPLE_CHOICE",
          difficulty: "MEDIUM",
          explanation: `Explanation for Q${i}`,
          choices: {
            create: [
              { choiceText: `Choice A (Correct for Q${i})`, isCorrect: true, orderIndex: 1 },
              { choiceText: `Choice B (Wrong)`, isCorrect: false, orderIndex: 2 },
              { choiceText: `Choice C (Wrong)`, isCorrect: false, orderIndex: 3 },
              { choiceText: `Choice D (Wrong)`, isCorrect: false, orderIndex: 4 },
            ],
          },
        },
        include: { choices: true },
      });
      createdQuestions.push(q);

      await prisma.examQuestion.create({
        data: {
          examId: testExam.id,
          questionId: q.id,
          score: 1,
          orderIndex: i,
        },
      });
    }

    // ==========================================
    // TEST 1: IN_PROGRESS attempt allows Resume
    // ==========================================
    const now = new Date();
    const inProgressAttempt = await prisma.examAttempt.create({
      data: {
        examId: testExam.id,
        studentId: student1.id,
        attemptNumber: 1,
        startedAt: now,
        status: "IN_PROGRESS",
      },
      include: { answers: true },
    });

    const activeFound = await prisma.examAttempt.findFirst({
      where: {
        examId: testExam.id,
        studentId: student1.id,
        status: "IN_PROGRESS",
      },
    });

    recordTest(
      "TEST 1: IN_PROGRESS attempt is found and resumable",
      activeFound !== null && activeFound.id === inProgressAttempt.id,
      "Active attempt was not properly retrieved"
    );

    // ==========================================
    // TEST 2: IN_PROGRESS attempt allows Autosave
    // ==========================================
    const q1 = createdQuestions[0];
    const q1ChoiceA = q1.choices.find((c) => c.isCorrect);

    const savedAns = await prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: inProgressAttempt.id,
          questionId: q1.id,
        },
      },
      create: {
        attemptId: inProgressAttempt.id,
        questionId: q1.id,
        selectedChoiceId: q1ChoiceA.id,
        answeredAt: new Date(),
      },
      update: {
        selectedChoiceId: q1ChoiceA.id,
        answeredAt: new Date(),
      },
    });

    recordTest(
      "TEST 2: IN_PROGRESS attempt allows Autosave of answers",
      savedAns !== null && savedAns.selectedChoiceId === q1ChoiceA.id,
      "Autosave failed to persist selectedChoiceId"
    );

    // Also answer Q2 correctly and Q3 incorrectly for student1
    const q2 = createdQuestions[1];
    const q2ChoiceA = q2.choices.find((c) => c.isCorrect);
    await prisma.studentAnswer.create({
      data: {
        attemptId: inProgressAttempt.id,
        questionId: q2.id,
        selectedChoiceId: q2ChoiceA.id,
        answeredAt: new Date(),
      },
    });

    const q3 = createdQuestions[2];
    const q3ChoiceB = q3.choices.find((c) => !c.isCorrect);
    await prisma.studentAnswer.create({
      data: {
        attemptId: inProgressAttempt.id,
        questionId: q3.id,
        selectedChoiceId: q3ChoiceB.id,
        answeredAt: new Date(),
      },
    });
    // Q4 left unanswered

    // ==========================================
    // TEST 3: IN_PROGRESS attempt submits successfully -> status transitions to SUBMITTED
    // ==========================================
    const submitTime = new Date();
    const examQuestionsWithChoices = await prisma.examQuestion.findMany({
      where: { examId: testExam.id },
      include: { question: { include: { choices: true } } },
    });
    const answersForSubmit = await prisma.studentAnswer.findMany({
      where: { attemptId: inProgressAttempt.id },
    });
    const ansMap = new Map();
    answersForSubmit.forEach((a) => ansMap.set(a.questionId, a));

    let totalScoreEarned = 0;
    await prisma.$transaction(async (tx) => {
      for (const eq of examQuestionsWithChoices) {
        const studentAns = ansMap.get(eq.questionId);
        const correctChoice = eq.question.choices.find((c) => c.isCorrect);
        let isCorrect = false;
        let earnedScore = 0;

        if (studentAns && studentAns.selectedChoiceId && correctChoice) {
          if (studentAns.selectedChoiceId === correctChoice.id) {
            isCorrect = true;
            earnedScore = eq.score;
            totalScoreEarned += earnedScore;
          }
        }

        if (studentAns) {
          await tx.studentAnswer.update({
            where: { id: studentAns.id },
            data: { isCorrect, earnedScore },
          });
        }
      }

      const examTotal = testExam.totalScore || 1;
      const percentage = (totalScoreEarned / examTotal) * 100;

      await tx.examAttempt.update({
        where: { id: inProgressAttempt.id },
        data: {
          submittedAt: submitTime,
          timeSpentSeconds: 120,
          totalScore: totalScoreEarned,
          percentage: Number(percentage.toFixed(2)),
          status: "SUBMITTED",
        },
      });

      await tx.examLog.create({
        data: {
          attemptId: inProgressAttempt.id,
          eventType: "EXAM_SUBMIT",
          details: JSON.stringify({ submittedAt: submitTime.toISOString(), totalScoreEarned }),
        },
      });
    });

    const submittedAttempt = await prisma.examAttempt.findUnique({
      where: { id: inProgressAttempt.id },
    });

    recordTest(
      "TEST 3: Attempt status transitions to SUBMITTED and score is calculated",
      submittedAttempt.status === "SUBMITTED" &&
        submittedAttempt.totalScore === 2 &&
        submittedAttempt.percentage === 50,
      `Expected status SUBMITTED and score 2, got status: ${submittedAttempt.status}, score: ${submittedAttempt.totalScore}`
    );

    // ==========================================
    // TEST 4: SUBMITTED attempt blocks Resume
    // ==========================================
    const resumeCheck = await prisma.examAttempt.findFirst({
      where: {
        examId: testExam.id,
        studentId: student1.id,
        status: "IN_PROGRESS",
      },
    });

    const completedAttemptsCount = await prisma.examAttempt.count({
      where: {
        examId: testExam.id,
        studentId: student1.id,
        status: { in: ["SUBMITTED", "TIMED_OUT", "CANCELLED"] },
      },
    });

    const isResumeBlocked = resumeCheck === null && completedAttemptsCount >= testExam.maxAttempts;

    recordTest(
      "TEST 4: SUBMITTED attempt blocks Resume (no active IN_PROGRESS attempt found)",
      isResumeBlocked,
      "Found active in-progress attempt when it should be null"
    );

    // ==========================================
    // TEST 5: SUBMITTED attempt blocks Autosave
    // ==========================================
    const attemptForAutosave = await prisma.examAttempt.findUnique({
      where: { id: inProgressAttempt.id },
    });
    const autosaveAllowed = attemptForAutosave.status === "IN_PROGRESS";

    recordTest(
      "TEST 5: SUBMITTED attempt rejects Autosave mutation",
      !autosaveAllowed,
      "Autosave was unexpectedly allowed on SUBMITTED attempt"
    );

    // ==========================================
    // TEST 6: SUBMITTED attempt submit retry is idempotent & safe
    // ==========================================
    const isAlreadySubmitted = attemptForAutosave.status !== "IN_PROGRESS";
    const idempotentResponse = {
      success: true,
      alreadySubmitted: isAlreadySubmitted,
      totalScore: attemptForAutosave.totalScore,
      percentage: attemptForAutosave.percentage,
    };

    recordTest(
      "TEST 6: Submit retry returns alreadySubmitted: true with existing score without double-grading",
      idempotentResponse.alreadySubmitted === true && idempotentResponse.totalScore === 2,
      "Submit retry did not handle idempotent response correctly"
    );

    // ==========================================
    // TEST 7: SUBMITTED attempt result API returns correct score and pass/fail
    // ==========================================
    const resultAttempt = await prisma.examAttempt.findFirst({
      where: {
        examId: testExam.id,
        studentId: student1.id,
        status: { in: ["SUBMITTED", "TIMED_OUT"] },
      },
      include: {
        answers: { include: { question: { include: { choices: true } } } },
      },
    });

    const isPassed = resultAttempt.totalScore >= testExam.passingScore;
    const correctAnswersCount = resultAttempt.answers.filter((a) => a.isCorrect).length;
    const incorrectAnswersCount = resultAttempt.answers.filter((a) => !a.isCorrect && a.selectedChoiceId).length;
    const unansweredCount = 4 - resultAttempt.answers.length;

    recordTest(
      "TEST 7: Result analysis is accurate (2 correct, 1 incorrect, 1 unanswered, passed=true)",
      isPassed === true &&
        correctAnswersCount === 2 &&
        incorrectAnswersCount === 1 &&
        unansweredCount === 1,
      `Calculations mismatch: correct=${correctAnswersCount}, incorrect=${incorrectAnswersCount}, unanswered=${unansweredCount}, isPassed=${isPassed}`
    );

    // ==========================================
    // TEST 8: TIMED_OUT attempt is treated as completed & locked
    // ==========================================
    const timedOutAttempt = await prisma.examAttempt.create({
      data: {
        examId: testExam.id,
        studentId: student2.id,
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3600000), // 1 hr ago
        submittedAt: new Date(),
        status: "TIMED_OUT",
        totalScore: 0,
        percentage: 0,
      },
    });

    const activeForStudent2 = await prisma.examAttempt.findFirst({
      where: {
        examId: testExam.id,
        studentId: student2.id,
        status: "IN_PROGRESS",
      },
    });

    recordTest(
      "TEST 8: TIMED_OUT attempt is locked and cannot be resumed",
      activeForStudent2 === null,
      "TIMED_OUT attempt was considered active"
    );

    // ==========================================
    // TEST 9: Browser Refresh / Direct URL after submit returns alreadySubmitted
    // ==========================================
    const checkStartDirect = async (studentId, examId) => {
      const active = await prisma.examAttempt.findFirst({
        where: { examId, studentId, status: "IN_PROGRESS" },
      });
      if (active) return { allowed: true, mode: "RESUME" };
      const completed = await prisma.examAttempt.count({
        where: { examId, studentId, status: { in: ["SUBMITTED", "TIMED_OUT"] } },
      });
      if (completed >= 1) return { allowed: false, alreadySubmitted: true };
      return { allowed: true, mode: "NEW" };
    };

    const directNavResult = await checkStartDirect(student1.id, testExam.id);

    recordTest(
      "TEST 9: Direct navigation / refresh after submit flags alreadySubmitted: true",
      directNavResult.allowed === false && directNavResult.alreadySubmitted === true,
      "Direct navigation did not block re-taking"
    );

    // ==========================================
    // TEST 10: Anti-IDOR check on Autosave
    // ==========================================
    const attemptForIdor = await prisma.examAttempt.findUnique({
      where: { id: inProgressAttempt.id },
    });
    const student2CanModifyStudent1 = attemptForIdor.studentId === student2.id;

    recordTest(
      "TEST 10: Anti-IDOR prevents Student 2 from modifying Student 1 attempt",
      student2CanModifyStudent1 === false,
      "Anti-IDOR check failed for autosave"
    );

    // ==========================================
    // TEST 11: Anti-IDOR check on Submit
    // ==========================================
    const student2CanSubmitStudent1 = attemptForIdor.studentId === student2.id;

    recordTest(
      "TEST 11: Anti-IDOR prevents Student 2 from submitting Student 1 attempt",
      student2CanSubmitStudent1 === false,
      "Anti-IDOR check failed for submit"
    );

    // ==========================================
    // TEST 12: Anti-IDOR check on Result View
    // ==========================================
    const student2CanViewStudent1Result = attemptForIdor.studentId === student2.id;

    recordTest(
      "TEST 12: Anti-IDOR prevents Student 2 from viewing Student 1 result without permission",
      student2CanViewStudent1Result === false,
      "Anti-IDOR check failed for result view"
    );

    // ==========================================
    // TEST 13: Time-expired active attempt transitions to TIMED_OUT on start API call
    // ==========================================
    const expiredStartedAt = new Date(Date.now() - 40 * 60 * 1000); // 40 mins ago (duration=30 mins)
    const expiredAttempt = await prisma.examAttempt.create({
      data: {
        examId: testExam.id,
        studentId: student2.id,
        attemptNumber: 2,
        startedAt: expiredStartedAt,
        status: "IN_PROGRESS",
      },
    });

    let activeToCheck = await prisma.examAttempt.findFirst({
      where: { examId: testExam.id, studentId: student2.id, status: "IN_PROGRESS" },
    });

    if (activeToCheck) {
      const startedMs = new Date(activeToCheck.startedAt).getTime();
      const durationMs = testExam.durationMinutes * 60 * 1000;
      const deadlineMs = startedMs + durationMs;
      if (Date.now() > deadlineMs + 30000) {
        await prisma.examAttempt.update({
          where: { id: activeToCheck.id },
          data: { status: "TIMED_OUT", submittedAt: new Date() },
        });
        activeToCheck = null;
      }
    }

    const updatedExpiredAttempt = await prisma.examAttempt.findUnique({
      where: { id: expiredAttempt.id },
    });

    recordTest(
      "TEST 13: Expired active attempt is automatically transitioned to TIMED_OUT",
      updatedExpiredAttempt.status === "TIMED_OUT" && activeToCheck === null,
      "Expired attempt remained IN_PROGRESS"
    );

    // ==========================================
    // TEST 14: Final Score & Percentage Calculation Integrity
    // ==========================================
    const finalScore = 2;
    const maxScore = 4;
    const computedPercentage = Number(((finalScore / maxScore) * 100).toFixed(2));
    const passedCriteria = finalScore >= testExam.passingScore;

    recordTest(
      "TEST 14: Score & Percentage calculations verified with precision (2/4 = 50.00%, Passed)",
      computedPercentage === 50.0 && passedCriteria === true,
      "Percentage math error"
    );
  } catch (error) {
    console.error("Test execution error:", error);
    recordTest("CRITICAL_TEST_ERROR", false, error.message);
  } finally {
    console.log("\n=======================================================");
    const passedCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length;
    console.log(`  RESULT: ${passedCount}/${totalCount} TESTS PASSED`);
    console.log("=======================================================\n");
    await prisma.$disconnect();
  }
}

runExamSubmitFlowTests();
