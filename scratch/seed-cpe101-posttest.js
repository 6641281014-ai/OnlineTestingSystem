const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedPostTest() {
  const cpe101 = await prisma.course.findUnique({
    where: { code: "CPE101" },
    include: {
      questions: { include: { choices: true } },
      exams: true,
      enrollments: { include: { student: true } },
    },
  });

  if (!cpe101) {
    console.log("CPE101 not found");
    return;
  }

  // Check if POST_TEST already exists
  let postExam = cpe101.exams.find((e) => e.examType === "POST_TEST");
  if (!postExam) {
    postExam = await prisma.exam.create({
      data: {
        courseId: cpe101.id,
        createdById: cpe101.instructorId,
        title: "แบบทดสอบวัดผลสัมฤทธิ์หลังเรียน (Post-test) - บทที่ 1 และ 2",
        description: "แบบทดสอบวัดผลสัมฤทธิ์หลังเรียนเพื่อประเมินความก้าวหน้าทางการเรียน",
        examType: "POST_TEST",
        totalScore: 3.0,
        passingScore: 1.5,
        durationMinutes: 30,
        shuffleQuestions: true,
        shuffleChoices: true,
        maxAttempts: 1,
        showScoreImmediately: true,
        allowReview: true,
        isPublished: true,
      },
    });

    // Add 3 questions to postExam
    let order = 1;
    for (const q of cpe101.questions) {
      await prisma.examQuestion.create({
        data: {
          examId: postExam.id,
          questionId: q.id,
          score: 1.0,
          orderIndex: order++,
        },
      });
    }
    console.log("Created Post-test exam:", postExam.title);
  }

  // Check if student has attempt
  const student = cpe101.enrollments[0]?.student;
  if (student) {
    const existingAttempt = await prisma.examAttempt.findFirst({
      where: { examId: postExam.id, studentId: student.id },
    });

    if (!existingAttempt) {
      // Create submitted attempt with 3/3 (100%)
      const attempt = await prisma.examAttempt.create({
        data: {
          examId: postExam.id,
          studentId: student.id,
          attemptNumber: 1,
          status: "SUBMITTED",
          totalScore: 3.0,
          percentage: 100.0,
          timeSpentSeconds: 650,
          submittedAt: new Date(),
        },
      });

      for (const q of cpe101.questions) {
        const correctChoice = q.choices.find((c) => c.isCorrect);
        if (correctChoice) {
          await prisma.studentAnswer.create({
            data: {
              attemptId: attempt.id,
              questionId: q.id,
              selectedChoiceId: correctChoice.id,
              isCorrect: true,
              earnedScore: 1.0,
            },
          });
        }
      }
      console.log(`Created Post-test attempt for ${student.name}: 3/3 (100%)`);
    }
  }

  console.log("Seed complete!");
}

seedPostTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
