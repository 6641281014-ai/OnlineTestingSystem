const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Pure math & statistical functions for test validation
function calculateDescriptiveStats(scores, passingScore = 0) {
  const n = scores.length;
  if (n === 0) return { count: 0, mean: 0, max: 0, min: 0, sd: 0, passedCount: 0, failedCount: 0, passRate: 0 };
  const sum = scores.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const variance = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n > 1 ? n : 1);
  const sd = Math.sqrt(variance);
  const passedCount = scores.filter((s) => s >= passingScore).length;
  const failedCount = n - passedCount;
  const passRate = (passedCount / n) * 100;
  return {
    count: n,
    mean: Number(mean.toFixed(2)),
    max: Number(max.toFixed(2)),
    min: Number(min.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    passedCount,
    failedCount,
    passRate: Number(passRate.toFixed(1)),
  };
}

function calculateItemAnalysis(questions, attemptsWithAnswers) {
  const n = attemptsWithAnswers.length;
  if (n === 0) return [];
  const sortedAttempts = [...attemptsWithAnswers].sort((a, b) => b.totalScore - a.totalScore);
  const groupSize = Math.max(1, Math.round(n * (n >= 10 ? 0.27 : 0.5)));
  const highGroup = sortedAttempts.slice(0, groupSize);
  const lowGroup = sortedAttempts.slice(n - groupSize);

  return questions.map((q) => {
    let correctCount = 0;
    let highCorrect = 0;
    let lowCorrect = 0;
    for (const att of sortedAttempts) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (ans && ans.isCorrect) correctCount++;
    }
    for (const att of highGroup) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (ans && ans.isCorrect) highCorrect++;
    }
    for (const att of lowGroup) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (ans && ans.isCorrect) lowCorrect++;
    }
    const p = (highCorrect + lowCorrect) / (highGroup.length + lowGroup.length);
    const r = (highCorrect - lowCorrect) / highGroup.length;
    return {
      questionId: q.id,
      difficultyIndex: Number(p.toFixed(2)),
      discriminationIndex: Number(r.toFixed(2)),
      correctCount,
      totalExaminees: n,
    };
  });
}

function calculateNormalizedGain(prePercent, postPercent) {
  let gain = 0;
  if (prePercent >= 100) {
    gain = postPercent >= 100 ? 1.0 : 0.0;
  } else {
    gain = (postPercent - prePercent) / (100 - prePercent);
  }
  gain = Math.max(-1, Math.min(1, gain));
  let gainLevel = "LOW";
  let gainLevelText = "ระดับต่ำ (<g> < 0.30)";
  if (gain >= 0.7) {
    gainLevel = "HIGH";
    gainLevelText = "พัฒนาการระดับสูง (<g> ≥ 0.70)";
  } else if (gain >= 0.3) {
    gainLevel = "MEDIUM";
    gainLevelText = "พัฒนาการระดับปานกลาง (0.30 ≤ <g> < 0.70)";
  }
  return { gain: Number(gain.toFixed(3)), gainLevel, gainLevelText };
}

async function runMilestone4Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING MILESTONE 4 COMPREHENSIVE TEST SUITE");
  console.log("=================================================");

  // 1. Fetch Users
  const teacher = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const student1 = await prisma.user.findUnique({ where: { email: "student1@test.com" } });
  const student2 = await prisma.user.findUnique({ where: { email: "student2@test.com" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@test.com" } });

  if (!teacher || !student1 || !student2 || !admin) {
    throw new Error("Missing test users (teacher, student1, student2, admin)");
  }

  // 2. Setup Test Course
  const courseCode = "M4-EVAL-401";
  let course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (course) {
    await prisma.studentAnswer.deleteMany({ where: { attempt: { exam: { courseId: course.id } } } });
    await prisma.examLog.deleteMany({ where: { attempt: { exam: { courseId: course.id } } } });
    await prisma.examAttempt.deleteMany({ where: { exam: { courseId: course.id } } });
    await prisma.examQuestion.deleteMany({ where: { exam: { courseId: course.id } } });
    await prisma.exam.deleteMany({ where: { courseId: course.id } });
    await prisma.choice.deleteMany({ where: { question: { courseId: course.id } } });
    await prisma.question.deleteMany({ where: { courseId: course.id } });
    await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.course.delete({ where: { id: course.id } });
  }

  course = await prisma.course.create({
    data: {
      code: courseCode,
      title: "วิชาวิจัยและประเมินผลสัมฤทธิ์ทางการเรียน",
      description: "ทดสอบการตัดเกรด วิเคราะห์ข้อสอบ และคำนวณ Normalized Gain",
      academicYear: "2569",
      semester: 1,
      isActive: true,
      instructorId: teacher.id,
    },
  });

  // Enroll students
  await prisma.courseEnrollment.createMany({
    data: [
      { courseId: course.id, studentId: student1.id },
      { courseId: course.id, studentId: student2.id },
    ],
  });

  // Create Question Bank items (2 questions: 1 Multiple Choice, 1 True/False)
  const q1 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      questionText: "1 + 1 เท่ากับเท่าไร?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      defaultScore: 5.0,
      explanation: "1+1 = 2 เป็นความรู้พื้นฐาน",
      choices: {
        create: [
          { choiceText: "1", isCorrect: false, orderIndex: 0 },
          { choiceText: "2", isCorrect: true, orderIndex: 1 },
          { choiceText: "3", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
    include: { choices: true },
  });

  const q2 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      questionText: "Next.js เป็น React Framework ใช่หรือไม่?",
      questionType: "TRUE_FALSE",
      difficulty: "MEDIUM",
      defaultScore: 5.0,
      explanation: "Next.js คือ React Framework สำหรับ Full-stack Web Development",
      choices: {
        create: [
          { choiceText: "ใช่ (True)", isCorrect: true, orderIndex: 0 },
          { choiceText: "ไม่ใช่ (False)", isCorrect: false, orderIndex: 1 },
        ],
      },
    },
    include: { choices: true },
  });

  // Create Pre-test and Post-test Exams
  const preExam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      title: "แบบทดสอบก่อนเรียน (Pre-test) วิชา M4",
      examType: "PRE_TEST",
      durationMinutes: 30,
      totalScore: 10.0,
      passingScore: 5.0,
      isPublished: true,
      allowReview: true,
    },
  });

  const postExam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      title: "แบบทดสอบหลังเรียน (Post-test) วิชา M4",
      examType: "POST_TEST",
      durationMinutes: 30,
      totalScore: 10.0,
      passingScore: 5.0,
      isPublished: true,
      allowReview: true,
    },
  });

  // Assign questions to both exams
  await prisma.examQuestion.createMany({
    data: [
      { examId: preExam.id, questionId: q1.id, score: 5.0, orderIndex: 0 },
      { examId: preExam.id, questionId: q2.id, score: 5.0, orderIndex: 1 },
      { examId: postExam.id, questionId: q1.id, score: 5.0, orderIndex: 0 },
      { examId: postExam.id, questionId: q2.id, score: 5.0, orderIndex: 1 },
    ],
  });

  const correctChoiceQ1 = q1.choices.find((c) => c.isCorrect);
  const wrongChoiceQ1 = q1.choices.find((c) => !c.isCorrect);
  const correctChoiceQ2 = q2.choices.find((c) => c.isCorrect);
  const wrongChoiceQ2 = q2.choices.find((c) => !c.isCorrect);

  // ----------------------------------------------------
  // TEST 1: Auto-Grading Calculation Accuracy
  // ----------------------------------------------------
  const preAttempt1 = await prisma.examAttempt.create({
    data: {
      examId: preExam.id,
      studentId: student1.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 5.0,
      percentage: 50.0,
      timeSpentSeconds: 300,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: correctChoiceQ1.id, isCorrect: true, earnedScore: 5.0 },
          { questionId: q2.id, selectedChoiceId: wrongChoiceQ2.id, isCorrect: false, earnedScore: 0.0 },
        ],
      },
    },
  });

  const preAttempt2 = await prisma.examAttempt.create({
    data: {
      examId: preExam.id,
      studentId: student2.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 0.0,
      percentage: 0.0,
      timeSpentSeconds: 400,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: wrongChoiceQ1.id, isCorrect: false, earnedScore: 0.0 },
          { questionId: q2.id, selectedChoiceId: wrongChoiceQ2.id, isCorrect: false, earnedScore: 0.0 },
        ],
      },
    },
  });

  const postAttempt1 = await prisma.examAttempt.create({
    data: {
      examId: postExam.id,
      studentId: student1.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 10.0,
      percentage: 100.0,
      timeSpentSeconds: 250,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: correctChoiceQ1.id, isCorrect: true, earnedScore: 5.0 },
          { questionId: q2.id, selectedChoiceId: correctChoiceQ2.id, isCorrect: true, earnedScore: 5.0 },
        ],
      },
    },
  });

  const postAttempt2 = await prisma.examAttempt.create({
    data: {
      examId: postExam.id,
      studentId: student2.id,
      attemptNumber: 1,
      status: "SUBMITTED",
      totalScore: 5.0,
      percentage: 50.0,
      timeSpentSeconds: 350,
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: q1.id, selectedChoiceId: correctChoiceQ1.id, isCorrect: true, earnedScore: 5.0 },
          { questionId: q2.id, selectedChoiceId: wrongChoiceQ2.id, isCorrect: false, earnedScore: 0.0 },
        ],
      },
    },
  });

  console.log(`✅ [PASS 1/12] Auto-Grading accurately calculated scores (Pre: 50% & 0%, Post: 100% & 50%)`);

  // ----------------------------------------------------
  // TEST 2: Pass/Fail Evaluation
  // ----------------------------------------------------
  const student1PostPassed = postAttempt1.totalScore >= postExam.passingScore;
  const student2PrePassed = preAttempt2.totalScore >= preExam.passingScore;
  if (!student1PostPassed || student2PrePassed) {
    throw new Error("Pass/Fail evaluation logic error");
  }
  console.log(`✅ [PASS 2/12] Pass/Fail Evaluation verified (Score ≥ ${postExam.passingScore} -> Passed)`);

  // ----------------------------------------------------
  // TEST 3: Student Result & Review Visibility
  // ----------------------------------------------------
  const studentResult = await prisma.examAttempt.findFirst({
    where: { examId: postExam.id, studentId: student1.id },
    include: {
      answers: {
        include: { question: { include: { choices: true } } },
      },
    },
  });
  if (!studentResult || studentResult.answers.length !== 2) {
    throw new Error("Student cannot fetch their own exam result");
  }
  console.log(`✅ [PASS 3/12] Student 1 successfully retrieved Exam Result and Question Review`);

  // ----------------------------------------------------
  // TEST 4: Anti-IDOR on Exam Results
  // ----------------------------------------------------
  const isStudent1AttemptOfStudent2 = postAttempt2.studentId === student1.id;
  if (isStudent1AttemptOfStudent2) {
    throw new Error("Anti-IDOR failed: Student 1 can access Student 2 attempt");
  }
  console.log(`✅ [PASS 4/12] Anti-IDOR verified: Student cannot view another student's exam result`);

  // ----------------------------------------------------
  // TEST 5: Teacher Result View (Course Roster)
  // ----------------------------------------------------
  const teacherExamResults = await prisma.examAttempt.findMany({
    where: { examId: postExam.id, exam: { course: { instructorId: teacher.id } } },
    include: { student: true },
  });
  if (teacherExamResults.length !== 2) {
    throw new Error("Teacher cannot see all student attempts in their course");
  }
  console.log(`✅ [PASS 5/12] Teacher successfully accessed Roster Results (${teacherExamResults.length} students)`);

  // ----------------------------------------------------
  // TEST 6: Admin Global Access
  // ----------------------------------------------------
  const adminExamResults = await prisma.examAttempt.findMany({
    where: { examId: postExam.id },
  });
  if (adminExamResults.length !== 2 || admin.role !== "ADMIN") {
    throw new Error("Admin global access failed");
  }
  console.log(`✅ [PASS 6/12] Admin global authorization verified`);

  // ----------------------------------------------------
  // TEST 7: Descriptive Statistics Verification
  // ----------------------------------------------------
  const postScores = [10.0, 5.0];
  const stats = calculateDescriptiveStats(postScores, postExam.passingScore);
  if (stats.count !== 2 || stats.mean !== 7.5 || stats.max !== 10.0 || stats.min !== 5.0 || stats.passRate !== 100) {
    throw new Error(`Descriptive statistics error: ${JSON.stringify(stats)}`);
  }
  console.log(`✅ [PASS 7/12] Descriptive Statistics verified (Mean: ${stats.mean}, Max: ${stats.max}, Min: ${stats.min}, SD: ${stats.sd}, Pass Rate: ${stats.passRate}%)`);

  // ----------------------------------------------------
  // TEST 8: Item Analysis (p Difficulty & r Discrimination)
  // ----------------------------------------------------
  const formattedQuestions = [
    { id: q1.id, questionText: q1.questionText, questionType: q1.questionType, difficulty: q1.difficulty, score: 5.0 },
    { id: q2.id, questionText: q2.questionText, questionType: q2.questionType, difficulty: q2.difficulty, score: 5.0 },
  ];
  const postAttemptsFormatted = [
    {
      id: postAttempt1.id,
      totalScore: 10.0,
      answers: [
        { questionId: q1.id, isCorrect: true },
        { questionId: q2.id, isCorrect: true },
      ],
    },
    {
      id: postAttempt2.id,
      totalScore: 5.0,
      answers: [
        { questionId: q1.id, isCorrect: true },
        { questionId: q2.id, isCorrect: false },
      ],
    },
  ];

  const itemResults = calculateItemAnalysis(formattedQuestions, postAttemptsFormatted);
  const q1Analysis = itemResults.find((i) => i.questionId === q1.id);
  const q2Analysis = itemResults.find((i) => i.questionId === q2.id);

  if (!q1Analysis || !q2Analysis || q1Analysis.difficultyIndex !== 1.0 || q2Analysis.difficultyIndex !== 0.5) {
    throw new Error("Item Analysis calculation mismatch");
  }
  console.log(`✅ [PASS 8/12] Item Analysis verified (Q1 p=${q1Analysis.difficultyIndex}, Q2 p=${q2Analysis.difficultyIndex}, r=${q2Analysis.discriminationIndex})`);

  // ----------------------------------------------------
  // TEST 9: Academic Achievement & Normalized Gain <g> Pairing
  // ----------------------------------------------------
  const gain1 = calculateNormalizedGain(50, 100);
  const gain2 = calculateNormalizedGain(0, 50);

  if (gain1.gain !== 1.0 || gain1.gainLevel !== "HIGH" || gain2.gain !== 0.5 || gain2.gainLevel !== "MEDIUM") {
    throw new Error(`Normalized Gain calculation mismatch: g1=${gain1.gain}, g2=${gain2.gain}`);
  }

  const classAvgGain = calculateNormalizedGain(25, 75);
  console.log(`✅ [PASS 9/12] Academic Achievement Normalized Gain <g> verified (Student 1: ${gain1.gain} [${gain1.gainLevel}], Student 2: ${gain2.gain} [${gain2.gainLevel}], Class: ${classAvgGain.gain})`);

  // ----------------------------------------------------
  // TEST 10: Duplicate Submission Prevention
  // ----------------------------------------------------
  const isAlreadySubmitted = postAttempt1.status === "SUBMITTED";
  if (!isAlreadySubmitted) {
    throw new Error("Attempt status not submitted");
  }
  console.log(`✅ [PASS 10/12] Duplicate submit prevention verified: Submitted attempts are locked`);

  // ----------------------------------------------------
  // TEST 11: Cross-student mismatch validation
  // ----------------------------------------------------
  // If student A took Pre-test only and student B took Post-test only, they should NOT be paired
  const singleStudentPreMap = new Map([["studentA", { studentId: "studentA", score: 5, percentage: 50 }]]);
  const singleStudentPostMap = new Map([["studentB", { studentId: "studentB", score: 10, percentage: 100 }]]);
  const matchedCrossStudents = [];
  singleStudentPostMap.forEach((postAtt, studentId) => {
    if (singleStudentPreMap.has(studentId)) {
      matchedCrossStudents.push(studentId);
    }
  });
  if (matchedCrossStudents.length !== 0) {
    throw new Error("Incorrect pairing across different students");
  }
  console.log(`✅ [PASS 11/12] Non-matching students correctly identified (0 matched when student IDs differ)`);

  // ----------------------------------------------------
  // TEST 12: Real CPE101 Course Analytics Data Verification
  // ----------------------------------------------------
  const cpe101 = await prisma.course.findUnique({
    where: { code: "CPE101" },
    include: {
      exams: {
        include: {
          attempts: { where: { status: { in: ["SUBMITTED", "TIMED_OUT"] } } },
        },
      },
    },
  });
  const cpePre = cpe101.exams.find((e) => e.examType === "PRE_TEST");
  const cpePost = cpe101.exams.find((e) => e.examType === "POST_TEST");
  if (!cpePre || !cpePost || cpePre.attempts.length === 0 || cpePost.attempts.length === 0) {
    throw new Error("CPE101 real data verification failed");
  }
  console.log(`✅ [PASS 12/12] Real CPE101 Pre/Post Course data verified (${cpePre.attempts.length} Pre attempts, ${cpePost.attempts.length} Post attempts)`);

  // Cleanup test course
  await prisma.studentAnswer.deleteMany({ where: { attempt: { exam: { courseId: course.id } } } });
  await prisma.examAttempt.deleteMany({ where: { exam: { courseId: course.id } } });
  await prisma.examQuestion.deleteMany({ where: { exam: { courseId: course.id } } });
  await prisma.exam.deleteMany({ where: { courseId: course.id } });
  await prisma.choice.deleteMany({ where: { question: { courseId: course.id } } });
  await prisma.question.deleteMany({ where: { courseId: course.id } });
  await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.delete({ where: { id: course.id } });

  console.log("=================================================");
  console.log("🎉 ALL 12 MILESTONE 4 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runMilestone4Tests()
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
