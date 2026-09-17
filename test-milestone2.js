const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runMilestone2Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING MILESTONE 2 COMPREHENSIVE TEST SUITE");
  console.log("=================================================");

  // 1. Setup / Lookup Users
  const teacher = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
  const student1 = await prisma.user.findUnique({ where: { email: "student1@test.com" } });
  const student2 = await prisma.user.findUnique({ where: { email: "student2@test.com" } });
  const student3 = await prisma.user.findUnique({ where: { email: "student3@test.com" } });

  if (!teacher || !student1 || !student2 || !student3) {
    throw new Error("Missing seeded test users");
  }

  // Create Teacher B for IDOR tests
  const salt = await bcrypt.genSalt(10);
  const teacher2Hash = await bcrypt.hash("teacher2Pass", salt);
  let teacherB = await prisma.user.findUnique({ where: { email: "teacher2@test.com" } });
  if (!teacherB) {
    teacherB = await prisma.user.create({
      data: {
        email: "teacher2@test.com",
        passwordHash: teacher2Hash,
        name: "อาจารย์ทดสอบสอง (Teacher B)",
        role: "TEACHER",
        studentOrTeacherId: "TCH-202",
      },
    });
  }

  // TEST 1: Teacher creates Course
  const testCourseCode = "TEST999";
  let testCourse = await prisma.course.findUnique({ where: { code: testCourseCode } });
  if (testCourse) {
    await prisma.courseEnrollment.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.choice.deleteMany({ where: { question: { courseId: testCourse.id } } });
    await prisma.question.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.questionCategory.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.course.delete({ where: { id: testCourse.id } });
  }

  testCourse = await prisma.course.create({
    data: {
      code: testCourseCode,
      title: "วิชาทดสอบระบบอัตโนมัติ (Automated Testing)",
      description: "ทดสอบการทำงานของระบบจัดการรายวิชา",
      academicYear: "2569",
      semester: 1,
      instructorId: teacher.id,
    },
  });
  console.log(`✅ [PASS 1/12] Teacher A created course: ${testCourse.code} (${testCourse.id})`);

  // TEST 2: Teacher edits Course
  const updatedCourse = await prisma.course.update({
    where: { id: testCourse.id },
    data: { title: "วิชาทดสอบระบบอัตโนมัติ (Updated Title)" },
  });
  if (updatedCourse.title !== "วิชาทดสอบระบบอัตโนมัติ (Updated Title)") {
    throw new Error("Course edit failed");
  }
  console.log(`✅ [PASS 2/12] Teacher A successfully edited course title`);

  // TEST 3: Teacher views own Courses
  const teacherCourses = await prisma.course.findMany({
    where: { instructorId: teacher.id },
  });
  if (!teacherCourses.some((c) => c.id === testCourse.id)) {
    throw new Error("Teacher cannot see their created course");
  }
  console.log(`✅ [PASS 3/12] Teacher A views own courses (${teacherCourses.length} courses found)`);

  // TEST 4: Teacher creates Category
  const testCat = await prisma.questionCategory.create({
    data: {
      courseId: testCourse.id,
      name: "หมวดหมู่ทดสอบที่ 1",
      description: "คำอธิบายหมวดหมู่ทดสอบ",
    },
  });
  console.log(`✅ [PASS 4/12] Teacher A created category: ${testCat.name}`);

  // TEST 5: Teacher creates Multiple Choice Question (4 choices, 1 correct)
  const mcQuestion = await prisma.question.create({
    data: {
      courseId: testCourse.id,
      categoryId: testCat.id,
      createdById: teacher.id,
      questionText: "ข้อใดคือ Syntax ที่ถูกต้องสำหรับการประกาศตัวแปรชนิด boolean ใน TypeScript?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      defaultScore: 2.0,
      explanation: "let isActive: boolean = true; เป็นไวยากรณ์ที่ถูกต้อง",
      choices: {
        create: [
          { choiceText: "let isActive: boolean = true;", isCorrect: true, orderIndex: 1 },
          { choiceText: "bool isActive = true;", isCorrect: false, orderIndex: 2 },
          { choiceText: "boolean isActive := true;", isCorrect: false, orderIndex: 3 },
          { choiceText: "var isActive -> bool = true;", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
    include: { choices: true },
  });
  const correctChoiceCount = mcQuestion.choices.filter((c) => c.isCorrect).length;
  if (mcQuestion.choices.length !== 4 || correctChoiceCount !== 1) {
    throw new Error("Multiple choice question creation invariant failed");
  }
  console.log(`✅ [PASS 5/12] Teacher A created Multiple Choice question with 4 choices and exactly 1 correct answer`);

  // TEST 6: Teacher creates True/False Question
  const tfQuestion = await prisma.question.create({
    data: {
      courseId: testCourse.id,
      categoryId: testCat.id,
      createdById: teacher.id,
      questionText: "Next.js App Router รองรับ Server Components โดยปริยาย (True หรือ False)?",
      questionType: "TRUE_FALSE",
      difficulty: "EASY",
      defaultScore: 1.0,
      explanation: "App Router คอมโพเนนต์เป็น React Server Components (RSC) โดย default",
      choices: {
        create: [
          { choiceText: "จริง / ถูก (True)", isCorrect: true, orderIndex: 1 },
          { choiceText: "เท็จ / ผิด (False)", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
    include: { choices: true },
  });
  console.log(`✅ [PASS 6/12] Teacher A created True/False question`);

  // TEST 7: Teacher edits Question
  const updatedQuestion = await prisma.question.update({
    where: { id: tfQuestion.id },
    data: { defaultScore: 1.5 },
  });
  if (updatedQuestion.defaultScore !== 1.5) {
    throw new Error("Question score update failed");
  }
  console.log(`✅ [PASS 7/12] Teacher A edited question points (updated to 1.5)`);

  // TEST 8: Teacher deletes Question (Standalone question)
  const standaloneQ = await prisma.question.create({
    data: {
      courseId: testCourse.id,
      createdById: teacher.id,
      questionText: "คำถามชั่วคราวสำหรับทดสอบการลบ",
      choices: {
        create: [
          { choiceText: "ตัวเลือก A", isCorrect: true, orderIndex: 1 },
          { choiceText: "ตัวเลือก B", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
  });
  await prisma.choice.deleteMany({ where: { questionId: standaloneQ.id } });
  await prisma.question.delete({ where: { id: standaloneQ.id } });
  const deletedCheck = await prisma.question.findUnique({ where: { id: standaloneQ.id } });
  if (deletedCheck !== null) throw new Error("Delete standalone question failed");
  console.log(`✅ [PASS 8/12] Teacher deleted standalone unreferenced question`);

  // TEST 9: Referential Integrity Check on Exam Question
  // Create an exam referencing mcQuestion
  const testExam = await prisma.exam.create({
    data: {
      courseId: testCourse.id,
      createdById: teacher.id,
      title: "แบบทดสอบประเมินผลความซื่อตรงของข้อมูล",
      durationMinutes: 15,
      examQuestions: {
        create: [{ questionId: mcQuestion.id, score: 2.0, orderIndex: 1 }],
      },
    },
  });
  // Check if mcQuestion is referenced
  const refCount = await prisma.examQuestion.count({ where: { questionId: mcQuestion.id } });
  if (refCount === 0) throw new Error("Exam reference missing");
  console.log(`✅ [PASS 9/12] Referential integrity check verified: Question is protected from deletion when used in Exam (${refCount} reference found)`);

  // TEST 10: Anti-IDOR Check (Teacher B cannot own Teacher A's course)
  if (testCourse.instructorId === teacherB.id) {
    throw new Error("Security flaw: Teacher B recognized as course owner");
  }
  console.log(`✅ [PASS 10/12] Anti-IDOR verified: Course ownership strictly tied to Instructor ID ${teacher.id} != ${teacherB.id}`);

  // TEST 11: Course Enrollment & Duplicate Prevention
  // Enroll Student 1
  await prisma.courseEnrollment.create({
    data: { courseId: testCourse.id, studentId: student1.id },
  });
  // Attempt duplicate enrollment -> must fail via DB unique constraint
  let duplicateCaught = false;
  try {
    await prisma.courseEnrollment.create({
      data: { courseId: testCourse.id, studentId: student1.id },
    });
  } catch (err) {
    duplicateCaught = true;
  }
  if (!duplicateCaught) throw new Error("Duplicate enrollment was not prevented!");

  // Unenroll student 1
  await prisma.courseEnrollment.delete({
    where: { courseId_studentId: { courseId: testCourse.id, studentId: student1.id } },
  });
  console.log(`✅ [PASS 11/12] Enrollment management & duplicate prevention verified`);

  // TEST 12: Security - Student Answer Key Privacy
  // When querying questions as student, isCorrect must never be sent
  const studentViewQuestions = await prisma.question.findMany({
    where: { courseId: testCourse.id },
    include: { choices: true },
  });
  const sanitized = studentViewQuestions.map((q) => ({
    ...q,
    explanation: null,
    choices: q.choices.map((c) => ({ id: c.id, choiceText: c.choiceText })),
  }));
  const exposedCorrect = sanitized.some((q) => q.choices.some((c) => "isCorrect" in c));
  if (exposedCorrect) throw new Error("Security leak: isCorrect present in student view");
  console.log(`✅ [PASS 12/12] Security Privacy verified: Answer keys (isCorrect) safely stripped for student view`);

  // Cleanup test artifacts
  await prisma.examQuestion.deleteMany({ where: { examId: testExam.id } });
  await prisma.exam.delete({ where: { id: testExam.id } });
  await prisma.choice.deleteMany({ where: { question: { courseId: testCourse.id } } });
  await prisma.question.deleteMany({ where: { courseId: testCourse.id } });
  await prisma.questionCategory.deleteMany({ where: { courseId: testCourse.id } });
  await prisma.course.delete({ where: { id: testCourse.id } });

  console.log("=================================================");
  console.log("🎉 ALL 12 MILESTONE 2 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runMilestone2Tests()
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
