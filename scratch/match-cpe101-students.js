const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function matchStudentsInCPE101() {
  const cpe101 = await prisma.course.findUnique({
    where: { code: "CPE101" },
    include: {
      questions: { include: { choices: true } },
      exams: true,
      enrollments: { include: { student: true } },
    },
  });

  const preExam = cpe101.exams.find((e) => e.examType === "PRE_TEST");
  const postExam = cpe101.exams.find((e) => e.examType === "POST_TEST");

  // Let's ensure both students have attempts on both exams
  for (const enrollment of cpe101.enrollments) {
    const student = enrollment.student;

    // 1. Pre-test attempt
    let preAtt = await prisma.examAttempt.findFirst({
      where: { examId: preExam.id, studentId: student.id },
    });
    if (!preAtt) {
      preAtt = await prisma.examAttempt.create({
        data: {
          examId: preExam.id,
          studentId: student.id,
          attemptNumber: 1,
          status: "SUBMITTED",
          totalScore: 1.0,
          percentage: 33.33,
          timeSpentSeconds: 600,
          submittedAt: new Date(),
        },
      });
      for (let i = 0; i < cpe101.questions.length; i++) {
        const q = cpe101.questions[i];
        const choice = i === 0 ? q.choices.find((c) => c.isCorrect) : q.choices.find((c) => !c.isCorrect);
        await prisma.studentAnswer.create({
          data: {
            attemptId: preAtt.id,
            questionId: q.id,
            selectedChoiceId: choice ? choice.id : null,
            isCorrect: i === 0,
            earnedScore: i === 0 ? 1.0 : 0.0,
          },
        });
      }
      console.log(`Created Pre-test attempt for ${student.name}`);
    }

    // 2. Post-test attempt
    let postAtt = await prisma.examAttempt.findFirst({
      where: { examId: postExam.id, studentId: student.id },
    });
    if (!postAtt) {
      postAtt = await prisma.examAttempt.create({
        data: {
          examId: postExam.id,
          studentId: student.id,
          attemptNumber: 1,
          status: "SUBMITTED",
          totalScore: 3.0,
          percentage: 100.0,
          timeSpentSeconds: 700,
          submittedAt: new Date(),
        },
      });
      for (const q of cpe101.questions) {
        const correctChoice = q.choices.find((c) => c.isCorrect);
        await prisma.studentAnswer.create({
          data: {
            attemptId: postAtt.id,
            questionId: q.id,
            selectedChoiceId: correctChoice ? correctChoice.id : null,
            isCorrect: true,
            earnedScore: 1.0,
          },
        });
      }
      console.log(`Created Post-test attempt for ${student.name}`);
    }
  }

  console.log("Matching complete!");
}

matchStudentsInCPE101()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
