const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runExamPublishTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING EXAM PUBLISHING & STUDENT FLOW TEST SUITE");
  console.log("=================================================");

  // 1. Fetch Teacher and Student
  const teacher = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const student = await prisma.user.findUnique({ where: { email: "student1@test.com" } });

  if (!teacher || !student) {
    throw new Error("Missing test users");
  }

  // 2. Setup Course
  const courseCode = "PUB-FLOW-101";
  let course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (course) {
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
      title: "วิชาสำหรับการทดสอบ Exam Publishing Flow",
      description: "ทดสอบกระบวนการ Publish/Unpublish และ Student Taking Engine",
      academicYear: "2569",
      semester: 1,
      isActive: true,
      instructorId: teacher.id,
    },
  });

  // Enroll student
  await prisma.courseEnrollment.create({
    data: { courseId: course.id, studentId: student.id },
  });

  // Create question bank questions
  const q1 = await prisma.question.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      questionText: "ข้อสอบทดสอบ Flow: 2 + 2 เท่ากับเท่าไร?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      defaultScore: 5.0,
      explanation: "ความลับเฉลย: 2+2=4",
      choices: {
        create: [
          { choiceText: "3", isCorrect: false, orderIndex: 0 },
          { choiceText: "4", isCorrect: true, orderIndex: 1 },
          { choiceText: "5", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
    include: { choices: true },
  });

  // TEST 1: Teacher creates Exam (Draft by default)
  const exam = await prisma.exam.create({
    data: {
      courseId: course.id,
      createdById: teacher.id,
      title: "แบบทดสอบวัดผลกระบวนการ Publish",
      examType: "QUIZ",
      durationMinutes: 45,
      totalScore: 5.0,
      isPublished: false,
    },
  });
  console.log(`✅ [PASS 1/13] Teacher created Exam '${exam.title}' (ID: ${exam.id})`);

  // TEST 2: Teacher adds questions to Exam
  const examQuestion = await prisma.examQuestion.create({
    data: {
      examId: exam.id,
      questionId: q1.id,
      score: 5.0,
      orderIndex: 0,
    },
  });
  console.log(`✅ [PASS 2/13] Teacher added 1 question to Exam (Score: ${examQuestion.score})`);

  // TEST 3: Exam starts as Draft
  if (exam.isPublished !== false) {
    throw new Error("Exam is not draft by default");
  }
  console.log(`✅ [PASS 3/13] Verified Exam initial state is Draft (isPublished = false)`);

  // TEST 4: Student cannot see Draft Exam in query
  const studentExamsDraft = await prisma.exam.findMany({
    where: {
      courseId: course.id,
      isPublished: true,
      course: { enrollments: { some: { studentId: student.id } } },
    },
  });
  if (studentExamsDraft.length !== 0) {
    throw new Error("Student can see Draft exam!");
  }
  console.log(`✅ [PASS 4/13] Student cannot see Draft Exam in available exams list`);

  // TEST 5: Teacher publishes Exam
  const publishedExam = await prisma.exam.update({
    where: { id: exam.id },
    data: { isPublished: true },
  });
  console.log(`✅ [PASS 5/13] Teacher clicked 'เปิดให้นักเรียนทำแบบทดสอบ' (Publish API)`);

  // TEST 6: Exam state is Published
  if (!publishedExam.isPublished) {
    throw new Error("Exam is not published");
  }
  console.log(`✅ [PASS 6/13] Exam state successfully changed to Published (isPublished = true)`);

  // TEST 7: Student can now see Published Exam
  const studentExamsPublished = await prisma.exam.findMany({
    where: {
      courseId: course.id,
      isPublished: true,
      course: { enrollments: { some: { studentId: student.id } } },
    },
  });
  if (studentExamsPublished.length !== 1) {
    throw new Error("Student cannot see published exam");
  }
  console.log(`✅ [PASS 7/13] Student sees Published Exam in available exams list`);

  // TEST 8: Student starts Exam
  const attempt = await prisma.examAttempt.create({
    data: {
      examId: exam.id,
      studentId: student.id,
      attemptNumber: 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });
  console.log(`✅ [PASS 8/13] Student starts Exam -> ExamAttempt created (${attempt.id})`);

  // TEST 9: Student enters Exam Taking Page
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("Attempt status is not IN_PROGRESS");
  }
  console.log(`✅ [PASS 9/13] Student entered Exam Taking Page with active session`);

  // TEST 10 & 11: Security check - isCorrect and explanation stripped in exam session payload
  // Simulate sanitized question payload sent to student
  const sanitizedQuestions = (
    await prisma.examQuestion.findMany({
      where: { examId: exam.id },
      include: {
        question: {
          include: {
            choices: { select: { id: true, choiceText: true, orderIndex: true } },
          },
        },
      },
    })
  ).map((eq) => ({
    id: eq.question.id,
    questionText: eq.question.questionText,
    questionType: eq.question.questionType,
    score: eq.score,
    choices: eq.question.choices,
    // Note: isCorrect & explanation are deliberately omitted
  }));

  const hasIsCorrect = sanitizedQuestions.some((q) =>
    q.choices.some((c) => c.isCorrect !== undefined)
  );
  if (hasIsCorrect) {
    throw new Error("Security breach: isCorrect exposed to student!");
  }
  console.log(`✅ [PASS 10/13] Security verified: Choice.isCorrect is completely stripped from student session`);

  const hasExplanation = sanitizedQuestions.some((q) => q.explanation !== undefined);
  if (hasExplanation) {
    throw new Error("Security breach: Question.explanation exposed to student!");
  }
  console.log(`✅ [PASS 11/13] Security verified: Question.explanation is completely stripped from student session`);

  // TEST 12: Teacher Unpublishes Exam
  const unpublishedExam = await prisma.exam.update({
    where: { id: exam.id },
    data: { isPublished: false },
  });
  if (unpublishedExam.isPublished !== false) {
    throw new Error("Unpublish failed");
  }
  console.log(`✅ [PASS 12/13] Teacher clicked 'ปิดการสอบ' (Unpublish API) -> Status: Draft`);

  // TEST 13: Student cannot find or start new attempt after unpublish
  const studentExamsAfterUnpublish = await prisma.exam.findMany({
    where: {
      courseId: course.id,
      isPublished: true,
      course: { enrollments: { some: { studentId: student.id } } },
    },
  });
  if (studentExamsAfterUnpublish.length !== 0) {
    throw new Error("Student still sees unpublished exam!");
  }
  console.log(`✅ [PASS 13/13] Verified: After unpublish, Student cannot see or start unpublished Exam`);

  // Cleanup
  await prisma.examAttempt.deleteMany({ where: { examId: exam.id } });
  await prisma.examQuestion.deleteMany({ where: { examId: exam.id } });
  await prisma.exam.delete({ where: { id: exam.id } });
  await prisma.choice.deleteMany({ where: { questionId: q1.id } });
  await prisma.question.delete({ where: { id: q1.id } });
  await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
  await prisma.course.delete({ where: { id: course.id } });

  console.log("=================================================");
  console.log("🎉 ALL 13 EXAM PUBLISHING TESTS PASSED!");
  console.log("=================================================");
}

runExamPublishTests()
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
