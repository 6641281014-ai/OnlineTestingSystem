const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspectCPE101() {
  const cpe101 = await prisma.course.findUnique({
    where: { code: "CPE101" },
    include: {
      questions: { select: { id: true, questionText: true } },
      exams: {
        include: {
          examQuestions: true,
          attempts: { include: { student: true, answers: true } },
        },
      },
    },
  });

  console.log("CPE101 Details:", JSON.stringify(cpe101, null, 2));
}

inspectCPE101()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
