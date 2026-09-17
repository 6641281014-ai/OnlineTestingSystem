const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testAnalyticsLogic() {
  const cpe101 = await prisma.course.findUnique({
    where: { code: "CPE101" },
  });

  const allExams = await prisma.exam.findMany({
    where: { courseId: cpe101.id },
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

  console.log("All exams in CPE101:", allExams.map((e) => ({
    title: e.title,
    type: e.examType,
    attempts: e._count.attempts,
  })));

  const preExam = allExams.find((e) => e.examType === "PRE_TEST") || allExams[0];
  const postExam = allExams.find((e) => e.examType === "POST_TEST") || allExams[1];

  const [preAttempts, postAttempts] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { examId: preExam.id, status: { in: ["SUBMITTED", "TIMED_OUT"] } },
      include: { student: true },
    }),
    prisma.examAttempt.findMany({
      where: { examId: postExam.id, status: { in: ["SUBMITTED", "TIMED_OUT"] } },
      include: { student: true },
    }),
  ]);

  console.log("Pre attempts:", preAttempts.map((a) => ({ student: a.student.name, score: a.totalScore, pct: a.percentage })));
  console.log("Post attempts:", postAttempts.map((a) => ({ student: a.student.name, score: a.totalScore, pct: a.percentage })));

  // If student 1 did pre-test, let's make sure student 1 also has post-test attempt in CPE101 if needed
  const preStudentIds = new Set(preAttempts.map((a) => a.studentId));
  const postStudentIds = new Set(postAttempts.map((a) => a.studentId));
  const matched = [...preStudentIds].filter((id) => postStudentIds.has(id));
  console.log("Matched students count:", matched.length);
}

testAnalyticsLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
