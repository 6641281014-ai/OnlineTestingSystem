const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanOrphanAttempts() {
  console.log("=== CLEANING ORPHAN IN_PROGRESS ATTEMPTS ===");

  // Find all IN_PROGRESS attempts with 0 answers
  const inProgressAttempts = await prisma.examAttempt.findMany({
    where: {
      status: "IN_PROGRESS",
      answers: { none: {} },
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      exam: { select: { id: true, title: true } },
    },
  });

  console.log(`Found ${inProgressAttempts.length} empty IN_PROGRESS attempt(s).`);

  let deletedCount = 0;
  for (const att of inProgressAttempts) {
    // Check if there is a sibling SUBMITTED or TIMED_OUT attempt for the same student and exam
    const siblingCompleted = await prisma.examAttempt.findFirst({
      where: {
        studentId: att.studentId,
        examId: att.examId,
        id: { not: att.id },
        status: { in: ["SUBMITTED", "TIMED_OUT"] },
      },
    });

    if (siblingCompleted) {
      console.log(
        `Deleting orphan attempt ${att.id} for student ${att.student.email} on exam "${att.exam.title}" (Sibling completed attempt: ${siblingCompleted.id}, Score: ${siblingCompleted.totalScore})`
      );
      // Delete exam logs first if any
      await prisma.examLog.deleteMany({
        where: { attemptId: att.id },
      });
      await prisma.examAttempt.delete({
        where: { id: att.id },
      });
      deletedCount++;
    } else {
      console.log(
        `Retaining active in-progress attempt ${att.id} for student ${att.student.email} on exam "${att.exam.title}" (No completed sibling)`
      );
    }
  }

  console.log(`\nCleanup complete: Deleted ${deletedCount} orphan attempt(s).`);
}

cleanOrphanAttempts()
  .catch((err) => {
    console.error("Cleanup Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
