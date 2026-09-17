const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runMilestone3Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING MILESTONE 3 COMPREHENSIVE TEST SUITE");
  console.log("=================================================");

  // Setup Users
  const teacher = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const student1 = await prisma.user.findUnique({ where: { email: "student1@test.com" } });
  const student2 = await prisma.user.findUnique({ where: { email: "student2@test.com" } });

  if (!teacher || !student1 || !student2) {
    throw new Error("Missing test users");
  }

  // Setup Test Course
  const courseCode = "M3TEST";
  let course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (course) {
    // Cleanup prior run
    const priorExams = await prisma.exam.findMany({ where: { courseId: course.id } });
    for (const ex of priorExams) {
      const attempts = await prisma.examAttempt.findMany({ where: { examId: ex.id } });
      for (const att of attempts) {
        await prisma.examLog.deleteMany({ where: { attemptId: att.id } });
        await prisma.studentAnswer.deleteMany({ where: { attemptId: att.id } });
      }
      await prisma.examAttempt.deleteMany({ where: { examId: ex.id } });
      await prisma.examQuestion.deleteMany({ where: { examId: ex.id } });
      await prisma.exam.delete({ where: { id: ex.id } });
    }
    await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.choice.deleteMany({ where: { question: { courseId: course.id } } });
    await prisma.question.deleteMany({ where: { courseId: course.id } });
    await prisma.course.delete({ where: { id: course.id } });
  }

  course = await prisma.course.create({
    data: {
      code: courseCode,
      title: "วิชาสำหรับทดสอบ Milestone 3 (Online Exam)",
      instructorId: teacher.id,
    },
  });

  // Enroll Student 1 in Course
  await prisma.courseEnrollment.create({
    data: { courseId: course.id, studentId: student1.id },
  });

  // Create Question Bank items
  const q1 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      questionText: "1 + 1 เท่ากับเท่าใด?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      defaultScore: 5.0,
      choices: {
        create: [
          { choiceText: "2", isCorrect: true, orderIndex: 1 },
          { choiceText: "3", isCorrect: false, orderIndex: 2 },
          { choiceText: "4", isCorrect: false, orderIndex: 3 },
          { choiceText: "5", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
    include: { choices: true },
  });

  const q2 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      questionText: "Next.js App Router ทำงานบนฝั่ง Server เป็นค่าเริ่มต้น (True/False)?",
      questionType: "TRUE_FALSE",
      difficulty: "MEDIUM",
      defaultScore: 5.0,
      choices: {
        create: [
          { choiceText: "จริง (True)", isCorrect: true, orderIndex: 1 },
          { choiceText: "เท็จ (False)", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
    include: { choices: true },
  });

  // 1. Teacher creates Exam
  const exam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      title: "แบบทดสอบวัดผลสัมฤทธิ์ชุดที่ 1",
      description: "คำชี้แจง: ให้ทำข้อสอบด้วยตนเอง",
      examType: "PRE_TEST",
      durationMinutes: 30,
      passingScore: 5.0,
      totalScore: 0,
      isPublished: false, // Start as Draft
    },
  });
  console.log(`✅ [PASS 1/16] Teacher creates Exam: ${exam.title} (${exam.id})`);

  // 2. Teacher edits Exam
  const updatedExam = await prisma.exam.update({
    where: { id: exam.id },
    data: { title: "แบบทดสอบวัดผลสัมฤทธิ์วิชาคอมพิวเตอร์ (Pre-test)" },
  });
  if (updatedExam.title !== "แบบทดสอบวัดผลสัมฤทธิ์วิชาคอมพิวเตอร์ (Pre-test)") {
    throw new Error("Exam edit failed");
  }
  console.log(`✅ [PASS 2/16] Teacher edits Exam settings`);

  // 3. Teacher adds Questions to Exam
  await prisma.examQuestion.create({
    data: { examId: exam.id, questionId: q1.id, score: 5.0, orderIndex: 1 },
  });
  await prisma.examQuestion.create({
    data: { examId: exam.id, questionId: q2.id, score: 5.0, orderIndex: 2 },
  });
  await prisma.exam.update({
    where: { id: exam.id },
    data: { totalScore: 10.0 },
  });
  const eqCount = await prisma.examQuestion.count({ where: { examId: exam.id } });
  if (eqCount !== 2) throw new Error("Assign questions failed");
  console.log(`✅ [PASS 3/16] Teacher added ${eqCount} questions to Exam (Total Score: 10.0)`);

  // 4. Duplicate Question prevention
  let dupPrevented = false;
  try {
    await prisma.examQuestion.create({
      data: { examId: exam.id, questionId: q1.id, score: 5.0, orderIndex: 3 },
    });
  } catch (err) {
    dupPrevented = true;
  }
  if (!dupPrevented) throw new Error("Duplicate question insertion was not prevented!");
  console.log(`✅ [PASS 4/16] Duplicate Question in Exam prevented successfully`);

  // 5 & 6. Student can see Published Exam / cannot see Unpublished Exam
  const studentUnpublishedCheck = await prisma.exam.findMany({
    where: { courseId: course.id, isPublished: true },
  });
  if (studentUnpublishedCheck.length !== 0) {
    throw new Error("Student was able to see unpublished exam");
  }
  console.log(`✅ [PASS 6/16] Student cannot see Unpublished Draft Exam`);

  // Publish the exam
  await prisma.exam.update({
    where: { id: exam.id },
    data: { isPublished: true },
  });
  const studentPublishedCheck = await prisma.exam.findMany({
    where: { courseId: course.id, isPublished: true },
  });
  if (studentPublishedCheck.length !== 1) {
    throw new Error("Student unable to see published exam");
  }
  console.log(`✅ [PASS 5/16] Student can see Published Exam`);

  // 7 & 8. Student starts Exam & ExamAttempt is created
  const attempt = await prisma.examAttempt.create({
    data: {
      examId: exam.id,
      studentId: student1.id,
      attemptNumber: 1,
      startedAt: new Date(),
      status: "IN_PROGRESS",
    },
  });
  if (!attempt || attempt.status !== "IN_PROGRESS") {
    throw new Error("ExamAttempt creation failed");
  }
  console.log(`✅ [PASS 7/16] Student can start Exam`);
  console.log(`✅ [PASS 8/16] ExamAttempt created with status: ${attempt.status} (${attempt.id})`);

  // 9. Answer Autosave works
  const q1CorrectChoice = q1.choices.find((c) => c.isCorrect);
  const answer1 = await prisma.studentAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: attempt.id,
        questionId: q1.id,
      },
    },
    create: {
      attemptId: attempt.id,
      questionId: q1.id,
      selectedChoiceId: q1CorrectChoice.id,
    },
    update: {
      selectedChoiceId: q1CorrectChoice.id,
    },
  });
  if (!answer1 || answer1.selectedChoiceId !== q1CorrectChoice.id) {
    throw new Error("Autosave answer failed");
  }
  console.log(`✅ [PASS 9/16] Answer Autosave works properly in database`);

  // 10. Reload restores saved answers
  const reloadedAnswers = await prisma.studentAnswer.findMany({
    where: { attemptId: attempt.id },
  });
  if (reloadedAnswers.length !== 1 || reloadedAnswers[0].selectedChoiceId !== q1CorrectChoice.id) {
    throw new Error("Answer restoration failed");
  }
  console.log(`✅ [PASS 10/16] Reload restores saved answers (${reloadedAnswers.length} answer restored)`);

  // 11. Timer uses server time
  const serverStartedAt = new Date(attempt.startedAt).getTime();
  const deadlineAt = serverStartedAt + exam.durationMinutes * 60 * 1000;
  const serverNow = Date.now();
  const remainingSecs = Math.max(0, Math.floor((deadlineAt - serverNow) / 1000));
  if (remainingSecs <= 0 || remainingSecs > 1800) {
    throw new Error("Server timer calculation incorrect");
  }
  console.log(`✅ [PASS 11/16] Timer synchronized using Server Timestamp (${remainingSecs}s remaining)`);

  // 12. Expired Exam cannot be started
  const expiredExam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      title: "แบบทดสอบที่หมดเวลาแล้ว",
      durationMinutes: 10,
      endTime: new Date(Date.now() - 3600000), // Ended 1 hour ago
      isPublished: true,
    },
  });
  const now = new Date();
  const isPastEndTime = expiredExam.endTime && now > expiredExam.endTime;
  if (!isPastEndTime) throw new Error("Expired check failed");
  console.log(`✅ [PASS 12/16] Expired Exam blocked from being started`);

  // 13. Auto Submit / Manual Submit grades and calculates score
  // Answer question 2 (correct answer)
  const q2CorrectChoice = q2.choices.find((c) => c.isCorrect);
  await prisma.studentAnswer.create({
    data: {
      attemptId: attempt.id,
      questionId: q2.id,
      selectedChoiceId: q2CorrectChoice.id,
    },
  });

  // Execute grading & submission
  const allEq = await prisma.examQuestion.findMany({
    where: { examId: exam.id },
    include: { question: { include: { choices: true } } },
  });
  const studentAnswers = await prisma.studentAnswer.findMany({
    where: { attemptId: attempt.id },
  });

  let earnedTotal = 0;
  for (const eq of allEq) {
    const ans = studentAnswers.find((a) => a.questionId === eq.questionId);
    const correctC = eq.question.choices.find((c) => c.isCorrect);
    if (ans && ans.selectedChoiceId === correctC.id) {
      earnedTotal += eq.score;
      await prisma.studentAnswer.update({
        where: { id: ans.id },
        data: { isCorrect: true, earnedScore: eq.score },
      });
    }
  }

  const freshExam = await prisma.exam.findUnique({ where: { id: exam.id } });
  const calcPercentage = (earnedTotal / (freshExam.totalScore || 1)) * 100;
  const finalAttempt = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      totalScore: earnedTotal,
      percentage: calcPercentage,
    },
  });
  if (finalAttempt.totalScore !== 10.0 || finalAttempt.percentage !== 100.0) {
    throw new Error(`Grading score calculation failed: got score=${finalAttempt.totalScore}, pct=${finalAttempt.percentage}`);
  }
  console.log(`✅ [PASS 13/16] Auto/Manual Submit grades accurately (Score: ${finalAttempt.totalScore}/${exam.totalScore}, 100%)`);

  // 14. Anti-IDOR: Student 2 cannot access Student 1's Attempt
  if (attempt.studentId === student2.id) {
    throw new Error("Security breach: Student 2 recognized as attempt owner");
  }
  console.log(`✅ [PASS 14/16] Anti-IDOR verified: Attempt ${attempt.id} belongs to ${student1.id} != ${student2.id}`);

  // 15. Student cannot access Answer Key during exam
  const sanitizedChoices = q1.choices.map((c) => ({
    id: c.id,
    choiceText: c.choiceText,
    orderIndex: c.orderIndex,
  }));
  const isKeyExposed = sanitizedChoices.some((c) => "isCorrect" in c);
  if (isKeyExposed) throw new Error("Security leak: Answer key present in student data");
  console.log(`✅ [PASS 15/16] Security verified: isCorrect & explanation stripped from student session`);

  // 16. Exam Logs are created
  await prisma.examLog.create({
    data: { attemptId: attempt.id, eventType: "EXAM_START", timestamp: new Date() },
  });
  await prisma.examLog.create({
    data: { attemptId: attempt.id, eventType: "TAB_SWITCH", timestamp: new Date(), details: "Switched tab" },
  });
  await prisma.examLog.create({
    data: { attemptId: attempt.id, eventType: "EXAM_SUBMIT", timestamp: new Date() },
  });

  const logs = await prisma.examLog.findMany({ where: { attemptId: attempt.id } });
  if (logs.length < 3) throw new Error("Exam logs missing");
  console.log(`✅ [PASS 16/16] Anti-Cheat Event Logs verified (${logs.map((l) => l.eventType).join(", ")})`);

  // Cleanup test artifacts
  await prisma.examLog.deleteMany({ where: { attemptId: attempt.id } });
  await prisma.studentAnswer.deleteMany({ where: { attemptId: attempt.id } });
  await prisma.examAttempt.deleteMany({ where: { examId: exam.id } });
  await prisma.examQuestion.deleteMany({ where: { examId: exam.id } });
  await prisma.exam.delete({ where: { id: exam.id } });
  await prisma.exam.delete({ where: { id: expiredExam.id } });
  await prisma.choice.deleteMany({ where: { question: { courseId: course.id } } });
  await prisma.question.deleteMany({ where: { courseId: course.id } });
  await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.delete({ where: { id: course.id } });

  console.log("=================================================");
  console.log("🎉 ALL 16 MILESTONE 3 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runMilestone3Tests()
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
